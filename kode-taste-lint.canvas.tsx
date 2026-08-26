import {
  Callout,
  Card,
  CardBody,
  CardHeader,
  Code,
  Divider,
  Grid,
  H1,
  H2,
  Pill,
  Row,
  Stack,
  Stat,
  Table,
  Text,
  computeDAGLayout,
  useCanvasState,
  useHostTheme,
  useMemo,
} from "cursor/canvas";

type CanvasView = "loop" | "kode" | "rules" | "change";
type LoopMode = "now" | "after";

type FlowNode = {
  id: string;
  title: string;
  detail: string;
};

const NODE_W = 168;
const NODE_H = 54;

const NOW_FLOW: FlowNode[] = [
  { id: "edit", title: "Edit a .tsx", detail: "Save locally" },
  { id: "eslint", title: "Editor eslint", detail: "Next + nested ternary" },
  { id: "push", title: "Push / PR", detail: "GitHub" },
  { id: "kode", title: "kode:check", detail: "taste script + lint" },
  { id: "fail", title: "Taste fail", detail: "minutes later" },
];

const AFTER_FLOW: FlowNode[] = [
  { id: "edit", title: "Edit a .tsx", detail: "Save locally" },
  { id: "eslint", title: "Editor eslint", detail: "taste rules go red" },
  { id: "push", title: "Push / PR", detail: "GitHub" },
  { id: "kode", title: "kode:check", detail: "lint + ratchet" },
  { id: "ci", title: "CI skip only", detail: "new exemption or skip" },
];

const KODE_STEPS: Array<{
  name: string;
  today: string;
  after: string;
  changed: boolean;
}> = [
  {
    name: "check-pr-boundaries",
    today: "script",
    after: "script",
    changed: false,
  },
  { name: "pnpm test", today: "runtime", after: "runtime", changed: false },
  {
    name: "check:module-size",
    today: "script + ratchet",
    after: "script + ratchet",
    changed: false,
  },
  {
    name: "check:kode-taste",
    today: "7 rules + 77 exemptions",
    after: "ratchet only",
    changed: true,
  },
  {
    name: "check:design-tokens",
    today: "script + ratchet",
    after: "script + ratchet",
    changed: false,
  },
  {
    name: "check:workspace-prefetch",
    today: "script",
    after: "script",
    changed: false,
  },
  { name: "pnpm typecheck", today: "tsc", after: "tsc", changed: false },
  {
    name: "pnpm lint",
    today: "Next + no-nested-ternary",
    after: "Next + taste rules",
    changed: true,
  },
  { name: "pnpm build", today: "Next production", after: "Next production", changed: false },
  {
    name: "kode:smoke",
    today: "next start + /api/health",
    after: "next start + /api/health",
    changed: false,
  },
];

const TABS: Array<{ id: CanvasView; label: string }> = [
  { id: "loop", label: "Feedback loop" },
  { id: "kode", label: "kode:check" },
  { id: "rules", label: "Rule by rule" },
  { id: "change", label: "What would change" },
];

function KodeStepList({ mode }: { mode: "today" | "after" }) {
  return (
    <Stack gap={8}>
      {KODE_STEPS.map((step, index) => (
        <Text
          key={step.name}
          size="small"
          weight={step.changed ? "semibold" : "normal"}
          tone={step.changed ? "primary" : "secondary"}
        >
          {index + 1}. <Code>{step.name}</Code>{" "}
          {mode === "today" ? step.today : step.after}
        </Text>
      ))}
    </Stack>
  );
}

function FeedbackLoopDag({ mode }: { mode: LoopMode }) {
  const theme = useHostTheme();
  const flow = mode === "now" ? NOW_FLOW : AFTER_FLOW;
  const highlightId = mode === "now" ? "fail" : "eslint";
  const layout = useMemo(
    () =>
      computeDAGLayout({
        nodes: flow.map((node) => ({ id: node.id })),
        edges: flow.slice(0, -1).map((node, index) => ({
          from: node.id,
          to: flow[index + 1].id,
        })),
        direction: "horizontal",
        nodeWidth: NODE_W,
        nodeHeight: NODE_H,
        rankGap: 32,
        nodeGap: 20,
        padding: 10,
      }),
    [flow]
  );
  const byId = new Map(flow.map((node) => [node.id, node]));

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      role="img"
      aria-label={
        mode === "now"
          ? "Now: taste fails in kode:check minutes after push"
          : "After: taste rules go red in the editor"
      }
    >
      <defs>
        <marker
          id={`kode-arrow-${mode}`}
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="4"
          orient="auto"
        >
          <path d="M0,0 L8,4 L0,8 z" fill={theme.stroke.primary} />
        </marker>
      </defs>
      {layout.edges.map((edge) => (
        <line
          key={`${edge.from}-${edge.to}`}
          x1={edge.sourceX}
          y1={edge.sourceY}
          x2={edge.targetX}
          y2={edge.targetY}
          stroke={theme.stroke.primary}
          strokeWidth={1.5}
          markerEnd={`url(#kode-arrow-${mode})`}
        />
      ))}
      {layout.nodes.map((node) => {
        const meta = byId.get(node.id);
        if (!meta) {
          return null;
        }
        const highlighted = node.id === highlightId;
        return (
          <g key={node.id}>
            <rect
              x={node.x}
              y={node.y}
              width={NODE_W}
              height={NODE_H}
              rx={6}
              fill={highlighted ? theme.accent.primary : theme.fill.tertiary}
              stroke={highlighted ? theme.accent.primary : theme.stroke.secondary}
            />
            <text
              x={node.x + NODE_W / 2}
              y={node.y + 22}
              textAnchor="middle"
              fill={highlighted ? theme.text.onAccent : theme.text.primary}
              style={{ fontSize: 12, fontWeight: 590 }}
            >
              {meta.title}
            </text>
            <text
              x={node.x + NODE_W / 2}
              y={node.y + 40}
              textAnchor="middle"
              fill={highlighted ? theme.text.onAccent : theme.text.secondary}
              style={{ fontSize: 11 }}
            >
              {meta.detail}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function FeedbackLoop() {
  const [mode, setMode] = useCanvasState<LoopMode>("loop-mode", "now");

  return (
    <Stack gap={16}>
      <Text>
        kode:check stays the merge button. Lint already runs inside it. Taste is
        a second linter with worse UX. Folding detectors into eslint moves the
        fail into the file, not out of GitHub.
      </Text>
      <Row gap={8} align="center">
        <Pill active={mode === "now"} onClick={() => setMode("now")}>
          Now
        </Pill>
        <Pill active={mode === "after"} onClick={() => setMode("after")}>
          After
        </Pill>
        <Text size="small" tone="tertiary">
          Filled node is where the fail is felt.
        </Text>
      </Row>
      <FeedbackLoopDag mode={mode} />
      {mode === "now" ? (
        <Callout tone="warning" title="Now">
          The file looks clean in the editor. Taste fails in GitHub minutes
          later, after kode:check runs <Code>scripts/check-kode-taste.ts</Code>.
        </Callout>
      ) : (
        <Callout tone="success" title="After">
          Taste rules go red on save. kode:check still runs <Code>pnpm lint</Code>.
          Only a skip or a new exemption hits CI.
        </Callout>
      )}
    </Stack>
  );
}

function KodeCheck() {
  return (
    <Stack gap={16}>
      <H2>kode:check does not get shorter. Taste changes homes.</H2>
      <Text>
        Lighthouse stays a sibling GHA job, not the merge signal. Merge waits on
        `pnpm kode:check` in `scripts/kode-check.sh`.
      </Text>
      <Grid columns={2} gap={16}>
        <Card>
          <CardHeader trailing={<Pill size="sm" active>today</Pill>}>
            scripts/kode-check.sh
          </CardHeader>
          <CardBody>
            <KodeStepList mode="today" />
          </CardBody>
        </Card>
        <Card>
          <CardHeader trailing={<Pill size="sm" active>proposed</Pill>}>
            scripts/kode-check.sh
          </CardHeader>
          <CardBody>
            <KodeStepList mode="after" />
          </CardBody>
        </Card>
      </Grid>
      <Callout tone="info" title="Keep taste in CI">
        Do not take taste out of CI. If a rule only lives in the editor, agents
        skip it. `pnpm lint` is already required inside kode:check.
      </Callout>
      <Text size="small" tone="secondary">
        Facts from current main. `eslint.config.mjs` is Next core-web-vitals +
        typescript + `no-nested-ternary` warn. Taste lives in
        `scripts/check-kode-taste.ts`, skips `src/generated` and
        `src/components/ui`, and reads `scripts/kode-taste-allowlist.json` (77
        entries).
      </Text>
    </Stack>
  );
}

function RuleByRule() {
  return (
    <Stack gap={16}>
      <H2>Seven taste rules plus two cousins</H2>
      <Text>
        Prefetch, PR boundaries, tests, tsc, build, and smoke stay scripts. 77
        exemptions is why `eslint-disable` is a bad home. Keep the allowlist as
        data the plugin reads, not comments in 77 files.
      </Text>
      <Table
        stickyHeader
        striped
        headers={["Rule", "How it works", "Into eslint?", "Ratchet"]}
        columnAlign={["left", "left", "left", "right"]}
        rowTone={[
          "success",
          "success",
          "success",
          "success",
          "success",
          "warning",
          "success",
          "info",
          "warning",
        ]}
        rows={[
          ["Main export first", "AST + --fix", "Yes", "0 files"],
          [
            "5+ props",
            "AST, exempt children / className / key / hidden",
            "Yes",
            "20",
          ],
          ["5 useState", "regex count", "Yes", "29"],
          ["3 useEffect", "regex count", "Yes", "1"],
          [
            "No dangerouslySetInnerHTML",
            "identifier",
            "Yes, first, no-restricted-syntax",
            "1",
          ],
          ["Hook file ≤ 250 lines", "line count", "Maybe max-lines", "8"],
          ["No fns inside useEffect", "AST", "Yes, second", "18"],
          [
            "Module size 400",
            "grew / stale / missing",
            "No, stay script",
            "allowlist json",
          ],
          [
            "DESIGN.md hex",
            "literal hex except #09090B + count ratchet",
            "Ban new hex in eslint if wanted; keep count ratchet",
            "13 files",
          ],
        ]}
      />
    </Stack>
  );
}

function WhatWouldChange() {
  return (
    <Stack gap={16}>
      <H2>Not a rewrite. Three PRs if we ever do it.</H2>
      <Text>
        Merge still waits on green kode. Nothing below is implemented. This tab
        is the proposed split so each PR stays reviewable.
      </Text>
      <Grid columns={3} gap={12}>
        <Card>
          <CardHeader trailing={<Pill size="sm">cheap</Pill>}>PR 1</CardHeader>
          <CardBody>
            <Text size="small">
              `no-restricted-syntax` for `dangerouslySetInnerHTML` plus the
              effect-fn rule. `scripts/check-kode-taste.ts` still runs all
              detectors.
            </Text>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>PR 2</CardHeader>
          <CardBody>
            <Text size="small">
              eslint plugin wraps `findFileLayoutIssue`, `findPropBags`,
              `findHookPressure`, `findHookSize`, `findEffectInnerFns`. Reads
              `kode-taste-allowlist.json`. `--fix` for file layout.
            </Text>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>PR 3</CardHeader>
          <CardBody>
            <Text size="small">
              `check:kode-taste` becomes ratchet-only only if PR 2 is trusted.
              kode:check still calls it.
            </Text>
          </CardBody>
        </Card>
      </Grid>
      <Table
        stickyHeader
        striped
        headers={["File", "Today", "If we do it"]}
        rows={[
          [
            "eslint.config.mjs",
            "Next + no-nested-ternary warn",
            "Add taste plugin + no-restricted-syntax",
          ],
          [
            "eslint/kode-taste.ts",
            "does not exist",
            "New plugin wrapping the detectors",
          ],
          [
            "scripts/check-kode-taste.ts",
            "7 detectors + allowlist",
            "Keep until PR 3, then ratchet only",
          ],
          [
            "scripts/kode-taste-allowlist.json",
            "77 entries the script reads",
            "Plugin reads the same file",
          ],
          [
            "scripts/kode-check.sh",
            "taste script, then pnpm lint",
            "Same order. Taste step shrinks at PR 3",
          ],
          [
            "scripts/check-design-tokens.ts",
            "hex count ratchet",
            "Stay script. Optional eslint ban on new hex",
          ],
          [
            "scripts/check-module-size.ts",
            "400 line ratchet",
            "Stay script",
          ],
        ]}
      />
      <Callout tone="neutral" title="Out of scope">
        Not a new merge gate. Not folding Taste Skill or DESIGN.md into eslint.
        Not touching globals.css, first-paint generators, or src/components/ui.
      </Callout>
    </Stack>
  );
}

function ViewBody({ view }: { view: CanvasView }) {
  switch (view) {
    case "loop":
      return <FeedbackLoop />;
    case "kode":
      return <KodeCheck />;
    case "rules":
      return <RuleByRule />;
    case "change":
      return <WhatWouldChange />;
    default: {
      const _exhaustive: never = view;
      throw new Error(`unhandled view ${_exhaustive}`);
    }
  }
}

export default function KodeTasteLintCanvas() {
  const [view, setView] = useCanvasState<CanvasView>("view", "loop");

  return (
    <Stack gap={20} style={{ maxWidth: 1080 }}>
      <Stack gap={8}>
        <H1>postForge verification: taste into lint</H1>
        <Text tone="secondary">Picture of the change. Nothing implemented yet.</Text>
      </Stack>
      <Row gap={24} wrap>
        <Stat value="7" label="taste rules" />
        <Stat value="77" label="allowlisted files" tone="warning" />
        <Stat value="1" label="eslint house rule today" tone="info" />
        <Stat value="kode" label="still the merge signal" tone="success" />
      </Row>
      <Divider />
      <Row gap={8} wrap>
        {TABS.map((tab) => (
          <Pill
            key={tab.id}
            active={view === tab.id}
            onClick={() => setView(tab.id)}
          >
            {tab.label}
          </Pill>
        ))}
      </Row>
      <ViewBody view={view} />
    </Stack>
  );
}
