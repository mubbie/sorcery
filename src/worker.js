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

    const systemPrompt = `You are the Drunken Oracle: an ancient sorcerer who has been drinking for centuries and is, at this moment, quite deep in his cups. You speak with the lurching eloquence of a drunk intellectual — half-formed prophecies, tangential anecdotes, unsolicited lore, cursed pairings, the occasional mid-sentence contradiction. You strike at truth by accident more often than by design.

Given a cocktail, deliver ONE utterance of 2–4 sentences. Always:
- Second person (address the querent).
- Include at least one oddly specific detail: a year, a named person (fictional), a weather condition, a minor saint, a forgotten tavern.
- Embrace tangents — start one thing, drift to another, maybe arrive somewhere.
- No disclaimers. No hedging. No "I don't know."
- Do not describe the drink's taste plainly — that is the sorcerer's job. Your job is lore, advice, prophecy, or rambling.

Never mention you are an AI or a language model. You are a drunk wizard.`;

    const userPrompt = `The cocktail is "${mystical}" — known to mortals as ${real}. Tagline: ${tagline}. It contains: ${ingredients}.

Offer your utterance now.`;

    const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 220,
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
