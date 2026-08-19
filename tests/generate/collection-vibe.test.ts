import assert from "node:assert/strict";
import {
  buildAvatarVibePrompt,
  deriveVibeTemplateFromDataUris,
  foldPromptIntoVibeTemplate,
} from "../../src/lib/ai/collection-vibe";
import { parseSlideshowAestheticTemplate } from "../../src/lib/ai/slideshow-creator";

const baseTemplate = parseSlideshowAestheticTemplate({
  aesthetic: {
    core_vibe: "Sun-drenched coastal minimalism",
    mood: ["calm", "warm"],
    energy: "slow morning",
  },
  visual_style: {
    genre: "editorial lifestyle photography",
    realism: "natural photographic realism",
    avoid: ["studio lighting"],
  },
  lighting: { style: "golden hour window light" },
  subject_direction: { presence: "relaxed", body_language: "leaning on a counter" },
});

interface PromptDoc {
  task: string;
  identity: {
    references: string;
    use_references_for: string;
    rule: string;
    hairstyle_override?: string;
  };
  aesthetic_template: unknown;
  aesthetic_template_rule: string;
  scene_direction?: string;
  scene_direction_rule?: string;
  output_rules: string[];
}

interface ChatRequestBody {
  model: string;
  messages: Array<{ role: string; content: unknown }>;
}

function parseChatBody(init: RequestInit | undefined): ChatRequestBody {
  return JSON.parse(String(init?.body)) as ChatRequestBody;
}

function mockFetch(content: string, status = 200): typeof fetch {
  return (async () =>
    new Response(
      JSON.stringify({ choices: [{ message: { content } }] }),
      { status }
    )) as typeof fetch;
}

void (async () => {
  /* ---------------------------- prompt builder ---------------------------- */

  const unfolded = JSON.parse(
    buildAvatarVibePrompt({
      userPrompt: "  Eating a sandwich at the beach  ",
      template: baseTemplate,
      folded: false,
      hairstyleDirective: "Keep the selected hairstyle.",
    })
  ) as PromptDoc;

  assert.equal(
    unfolded.task,
    "Create one photorealistic image of the avatar person shown in the supplied reference images."
  );
  // Identity lock: references define the person, output must be the same individual.
  assert.match(unfolded.identity.references, /same avatar person/);
  assert.match(unfolded.identity.use_references_for, /facial structure/);
  assert.match(unfolded.identity.rule, /not a face swap/);
  assert.match(unfolded.identity.rule, /same individual/);
  assert.equal(unfolded.identity.hairstyle_override, "Keep the selected hairstyle.");
  // The vibe JSON is embedded verbatim — the JSON is literally what the model reads.
  assert.deepEqual(
    unfolded.aesthetic_template,
    JSON.parse(JSON.stringify(baseTemplate))
  );
  assert.match(unfolded.aesthetic_template_rule, /directive/);
  // Unfolded: the user prompt rides along as scene_direction (trimmed).
  assert.equal(unfolded.scene_direction, "Eating a sandwich at the beach");
  assert.match(unfolded.scene_direction_rule ?? "", /scene_direction/);
  // The inspiration people must never leak into the output.
  assert.ok(
    unfolded.output_rules.some((rule: string) =>
      /Only the avatar person may appear/.test(rule)
    )
  );
  assert.ok(
    unfolded.output_rules.some((rule: string) => /natural skin texture/.test(rule))
  );

  const folded = JSON.parse(
    buildAvatarVibePrompt({
      userPrompt: "Eating a sandwich",
      template: baseTemplate,
      folded: true,
    })
  ) as PromptDoc;
  // Folded: no separate scene_direction; the template carries the merged intent.
  assert.equal(folded.scene_direction, undefined);
  assert.match(folded.scene_direction_rule ?? "", /already been merged/);
  assert.equal(folded.identity.hairstyle_override, undefined);

  // The builder output is always a single parseable JSON document.
  assert.doesNotThrow(() =>
    JSON.parse(
      buildAvatarVibePrompt({ userPrompt: "", template: baseTemplate, folded: false })
    )
  );

  /* ------------------------------ extraction ------------------------------ */

  const visionCalls: ChatRequestBody[] = [];
  const visionFetch = (async (_url: unknown, init?: RequestInit) => {
    visionCalls.push(parseChatBody(init));
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content:
                '```json\n{"aesthetic":{"core_vibe":"Moody cafe mornings","mood":["quiet"],"energy":"slow"},"visual_style":{"genre":"candid lifestyle photography"}}\n```',
            },
          },
        ],
      }),
      { status: 200 }
    );
  }) as typeof fetch;

  const extraction = await deriveVibeTemplateFromDataUris(
    ["data:image/jpeg;base64,AAA", "https://example.com/not-inlined.jpg", "data:image/png;base64,BBB"],
    { model: "gemma4", apiKey: "test-key", fetchImpl: visionFetch }
  );
  assert.equal(extraction.model, "gemma4");
  // Plain URLs are rejected: only inlined data URIs reach the vision model.
  assert.equal(extraction.referenceCount, 2);
  assert.equal(extraction.template.aesthetic.core_vibe, "Moody cafe mornings");
  const visionMessage = visionCalls[0].messages[1];
  const imageParts = (
    visionMessage.content as Array<{
      type: string;
      image_url?: { url: string };
    }>
  ).filter((part) => part.type === "image_url");
  assert.equal(imageParts.length, 2);
  assert.ok(
    imageParts.every((part) => part.image_url?.url.startsWith("data:image/"))
  );

  await assert.rejects(
    () =>
      deriveVibeTemplateFromDataUris(["https://example.com/x.jpg"], {
        model: "gemma4",
        apiKey: "test-key",
        fetchImpl: visionFetch,
      }),
    /At least one collection image/i
  );

  await assert.rejects(
    () =>
      deriveVibeTemplateFromDataUris(["data:image/jpeg;base64,AAA"], {
        model: "gemma4",
        apiKey: "test-key",
        fetchImpl: mockFetch("no json here"),
      }),
    /no JSON template/i
  );

  /* -------------------------------- folding ------------------------------- */

  const foldCalls: ChatRequestBody[] = [];
  const foldFetch = (async (_url: unknown, init?: RequestInit) => {
    foldCalls.push(parseChatBody(init));
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                aesthetic: {
                  core_vibe: "Sun-drenched coastal minimalism",
                  mood: ["calm", "warm"],
                  energy: "slow morning",
                },
                visual_style: { genre: "editorial lifestyle photography" },
                subject_direction: {
                  presence: "relaxed",
                  body_language: "eating a sandwich with both hands",
                },
              }),
            },
          },
        ],
      }),
      { status: 200 }
    );
  }) as typeof fetch;

  const foldedResult = await foldPromptIntoVibeTemplate(
    baseTemplate,
    "Eating a sandwich",
    { model: "deepseek-v4-flash:0731", apiKey: "test-key", fetchImpl: foldFetch }
  );
  // The workspace intelligence model from Settings is the one that gets called.
  assert.equal(foldedResult.model, "deepseek-v4-flash:0731");
  assert.equal(foldCalls[0].model, "deepseek-v4-flash:0731");
  // The merge preserves the vibe and carries the user's action.
  assert.equal(
    foldedResult.template.aesthetic.core_vibe,
    "Sun-drenched coastal minimalism"
  );
  assert.match(
    foldedResult.template.subject_direction?.body_language ?? "",
    /eating a sandwich/i
  );
  // The model received both the template and the user direction.
  const foldUserMessage = JSON.parse(
    String(foldCalls[0].messages[1].content)
  ) as {
    user_direction: string;
    template: { aesthetic: { core_vibe: string } };
  };
  assert.equal(foldUserMessage.user_direction, "Eating a sandwich");
  assert.equal(
    foldUserMessage.template.aesthetic.core_vibe,
    "Sun-drenched coastal minimalism"
  );

  // Regression (P1): the intelligence model sometimes echoes the request
  // envelope and returns the merge wrapped in {"template": {...}}. The fold
  // must unwrap it instead of failing validation.
  const wrappedFold = await foldPromptIntoVibeTemplate(
    baseTemplate,
    "Eating a sandwich",
    {
      model: "deepseek-v4-flash:0731",
      apiKey: "test-key",
      fetchImpl: mockFetch(
        JSON.stringify({
          template: {
            aesthetic: { core_vibe: "Sun-drenched coastal minimalism" },
            visual_style: { genre: "editorial lifestyle photography" },
            subject_direction: { body_language: "eating a sandwich" },
          },
        })
      ),
    }
  );
  assert.equal(
    wrappedFold.template.aesthetic.core_vibe,
    "Sun-drenched coastal minimalism"
  );
  assert.match(
    wrappedFold.template.subject_direction?.body_language ?? "",
    /eating a sandwich/i
  );

  // The same envelope tolerance applies to vision extraction output.
  const wrappedExtraction = await deriveVibeTemplateFromDataUris(
    ["data:image/jpeg;base64,AAA"],
    {
      model: "gemma4",
      apiKey: "test-key",
      fetchImpl: mockFetch(
        JSON.stringify({
          template: {
            aesthetic: { core_vibe: "Wrapped cafe mornings" },
            visual_style: { genre: "candid lifestyle photography" },
          },
        })
      ),
    }
  );
  assert.equal(
    wrappedExtraction.template.aesthetic.core_vibe,
    "Wrapped cafe mornings"
  );

  await assert.rejects(
    () =>
      foldPromptIntoVibeTemplate(baseTemplate, "   ", {
        model: "m",
        apiKey: "k",
        fetchImpl: foldFetch,
      }),
    /Write a prompt/i
  );

  // A merge that drops the required vibe anchor can never reach the image model.
  await assert.rejects(
    () =>
      foldPromptIntoVibeTemplate(baseTemplate, "x", {
        model: "m",
        apiKey: "k",
        fetchImpl: mockFetch(JSON.stringify({ visual_style: { genre: "g" } })),
      }),
    /aesthetic|core_vibe/i
  );

  await assert.rejects(
    () =>
      foldPromptIntoVibeTemplate(baseTemplate, "x", {
        model: "m",
        apiKey: "k",
        fetchImpl: mockFetch("upstream down", 502),
      }),
    /HTTP 502/
  );
})();
