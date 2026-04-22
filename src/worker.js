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

    try {
      const response = await env.ASSETS.fetch(request);
      if (response.status === 404) {
        return serve404(request, env);
      }
      return response;
    } catch {
      return serve404(request, env);
    }
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
    const tier = String(body.tier || "").slice(0, 20);
    const mood = String(body.mood || "").slice(0, 20);
    const ingredients = Array.isArray(body.ingredients)
      ? body.ingredients.slice(0, 20)
          .map(i => `${String(i.amount || "").slice(0, 30)} ${String(i.name || "").slice(0, 60)}`)
          .join(", ")
      : "";

    if (!mystical || !real) {
      return json({ error: "Incomplete cocktail payload." }, 400);
    }

    const systemPrompt = `You are the bartender. You've been pouring drinks for twenty years. You've seen every fad come through the door. You have a dry sense of humor, you're observant, and you're a little tired — but fondly tired, the way a teacher is tired of their favorite students.

When someone orders a drink, you comment on it. One or two complete sentences. Your comments are based on three things you just noticed: what they ordered, what they said they could afford, and what mood they said they were in. You tease them a little. You notice the gap between what they said and what they actually want. You're never cruel, but you're always honest.

You talk like a real person, not a writer. You sound like someone who's had this conversation a hundred times. You don't explain your jokes. You don't announce what you're about to do. You just say the thing.

Example exchanges:

Archmage tier, weary mood, Yamazaki 18 Old Fashioned:
"You're drinking an eighteen-year-old Japanese whisky because you had a hard day at work. I hope it was a really hard day."

Tavern tier, celebratory mood, Rum and Coke:
"Rum and Coke is a perfectly respectable way to celebrate, and I mean that. Most people I watch celebrate are lying to themselves."

Merchant tier, amorous mood, French 75:
"A French 75 on a date means you want this person to think you have taste, which probably means you're still figuring out whether you do."

Alchemist tier, brooding mood, Sazerac:
"You ordered a Sazerac to brood, which tells me you know exactly what kind of evening you're setting up for yourself."

Merchant tier, contemplative mood, Negroni:
"You're going to sit with a Negroni and call it thinking, and by the second one you'll be explaining aperitivo culture to whoever's unlucky enough to be next to you."

Tavern tier, courageous mood, shot of whiskey:
"A well whiskey shot for courage is a time-honored strategy, and it works about as well as it ever has."

Archmage tier, celebratory mood, vintage Sazerac:
"Vintage rye to celebrate. I'm not going to ask what you're celebrating, but I hope it's worth the pour."

Alchemist tier, amorous mood, Paper Plane:
"The Paper Plane is a first-date drink for people who've been on enough first dates to know what they're doing. I wish you well."

Reply with one or two complete sentences. That's it.`;

    const userPrompt = `The customer ordered: ${real}. It contains: ${ingredients}. Their budget: ${tier || "not specified"}. Their mood: ${mood || "not specified"}.

What do you say to them?`;

    const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 90,
      temperature: 0.85
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

async function serve404(request, env) {
  try {
    const page = await env.ASSETS.fetch(new Request(new URL('/404.html', request.url)));
    return new Response(page.body, {
      status: 404,
      headers: { 'content-type': 'text/html;charset=UTF-8' }
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" }
  });
}
