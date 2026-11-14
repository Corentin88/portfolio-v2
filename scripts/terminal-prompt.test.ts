import { PassThrough } from "node:stream";
import { afterEach, describe, expect, it } from "vitest";
import { createTerminalPrompt, type TerminalPrompt } from "./terminal-prompt";

// Faux terminal : on tape dans `input`, on lit tout ce qui serait affiché dans `output`.
function fakeTerminal() {
  const input = new PassThrough();
  const output = new PassThrough();
  let screen = "";
  output.on("data", (chunk: Buffer) => (screen += chunk.toString()));
  const prompt = createTerminalPrompt(input, output);
  return { input, prompt, screen: () => screen };
}

let current: TerminalPrompt | undefined;
afterEach(() => current?.close());

describe("createTerminalPrompt", () => {
  it("affiche l'invite et l'écho d'une saisie visible", async () => {
    const terminal = fakeTerminal();
    current = terminal.prompt;

    const answer = terminal.prompt.ask("E-mail : ");
    terminal.input.write("fictif@example.com\r");

    await expect(answer).resolves.toBe("fictif@example.com");
    expect(terminal.screen()).toContain("E-mail : ");
    expect(terminal.screen()).toContain("fictif@example.com");
  });

  it("affiche l'invite mais jamais le texte d'une saisie masquée", async () => {
    const terminal = fakeTerminal();
    current = terminal.prompt;

    const answer = terminal.prompt.ask("Mot de passe : ", true);
    terminal.input.write("secret-fictif-123\r");

    await expect(answer).resolves.toBe("secret-fictif-123");
    expect(terminal.screen()).toContain("Mot de passe : ");
    expect(terminal.screen()).not.toContain("secret");
  });

  it("enchaîne les quatre questions du script, toutes visibles", async () => {
    const terminal = fakeTerminal();
    current = terminal.prompt;
    const steps: [string, string, boolean][] = [
      ["E-mail : ", "fictif@example.com", false],
      ["Nom affiché : ", "Nom Fictif", false],
      ["Mot de passe : ", "secret-fictif-123", true],
      ["Confirmation : ", "secret-fictif-123", true],
    ];

    for (const [question, typed, hidden] of steps) {
      const answer = terminal.prompt.ask(question, hidden);
      terminal.input.write(`${typed}\r`);
      await expect(answer).resolves.toBe(typed);
    }

    for (const [question] of steps)
      expect(terminal.screen()).toContain(question);
    expect(terminal.screen()).toContain("Nom Fictif");
    expect(terminal.screen()).not.toContain("secret");
  });
});
