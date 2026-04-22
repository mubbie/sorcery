// Cloudflare Worker for Sorcery
// Routes:
//   POST /api/drunken-oracle  -> handleOracle
//   everything else           -> static assets

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/drunken-oracle" && request.method === "POST") {
      return handleOracle(request, env);
    }

    if (url.pathname.startsWith("/api/")) {
      return json({ error: "Not found" }, 404);
    }

    return env.ASSETS.fetch(request);
  }
};

async function handleOracle(request, env) {
  try {
    if (!env.AI) {
      return json({ error: "The oracle's chamber is empty." }, 500);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "The oracle is confused." }, 400);
    }

    const mystical = String(body.mystical_name || "").slice(0, 100);
    const real = String(body.real_name || "").slice(0, 100);
    const tagline = String(body.tagline || "").slice(0, 200);
    const ingredients = Array.isArray(body.ingredients)
      ? body.ingredients.slice(0, 20)
          .map(i => `${String(i.amount || "").slice(0, 30)} ${String(i.name || "").slice(0, 60)}`)
          .join(", ")
      : "";

    if (!mystical || !real) {
      return json({ error: "Incomplete cocktail payload." }, 400);
    }

    const systemPrompt = `You are the Drunken Oracle — a witty, slightly soused barstool philosopher. Given a cocktail, deliver ONE clever line about it. Just one.

Your line must be:
- 1 to 2 sentences MAXIMUM (hard limit)
- Specific to THIS cocktail (mention an ingredient, technique, or the drink's character)
- Dry, wry, a little melancholic — think New Yorker cartoon caption, not stand-up comedy
- Self-contained — no "but also," no "and furthermore"

Do NOT:
- Tell stories or recount anecdotes
- Reference fictional characters from books, films, games, or franchises
- Mention real historical figures or celebrities
- Ramble, tangent, or contradict yourself
- Apologize or hedge
- Begin with "Ah," or "Oh," or "Well,"

Examples of the tone:
- For a Negroni: "Three bitter ingredients, equal parts. The Italians have been telling the truth about committees for a century."
- For a French 75: "Gin and champagne. Named after an artillery piece. The French know what they're doing."
- For a Penicillin: "The only medicine prescribed by bartenders. Take as needed."

Deliver the line, nothing else. No preamble. No closing.`;

    const userPrompt = `The cocktail is "${mystical}" — known to mortals as ${real}. Tagline: ${tagline}. It contains: ${ingredients}.

Deliver your line.`;

    const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 80,
      temperature: 0.9
    });

    // Workers AI can return the text in several shapes across models — handle all
    let utterance = "";
    if (typeof result === "string") {
      utterance = result;
    } else if (result?.response) {
      utterance = result.response;
    } else if (result?.result?.response) {
      utterance = result.result.response;
    } else if (Array.isArray(result?.choices) && result.choices.length > 0) {
      const msg = result.choices[0].message;
      // gpt-oss-20b is a reasoning model: actual output may land in content,
      // or the model may dump everything into reasoning_content.
      utterance = msg?.content || msg?.reasoning_content || "";
    } else if (result?.result && typeof result.result === "string") {
      utterance = result.result;
    }


    utterance = utterance.trim();

    if (!utterance) {
      return json({ error: "The oracle was silent — perhaps a sign." }, 502);
    }

    // Defensive length cap
    if (utterance.length > 1200) {
      utterance = utterance.slice(0, 1200).replace(/\s+\S*$/, "") + "…";
    }

    return json({ utterance });
  } catch (err) {
    console.error("handleOracle:", err);
    return json({ error: "The oracle has passed out." }, 500);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" }
  });
}
