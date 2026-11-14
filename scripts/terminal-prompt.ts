import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";

export type TerminalPrompt = {
  ask: (prompt: string, hidden?: boolean) => Promise<string>;
  close: () => void;
};

/**
 * Questions posées dans le terminal, avec saisie masquée possible.
 * L'invite est confiée à readline (et non écrite à part) : en mode terminal,
 * readline efface puis redessine la ligne courante, ce qui ferait disparaître
 * une invite écrite directement sur la sortie (constaté sous PowerShell).
 */
export function createTerminalPrompt(
  input: NodeJS.ReadableStream,
  output: NodeJS.WritableStream,
): TerminalPrompt {
  let muted = false;
  const echo = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      if (!muted) output.write(chunk);
      callback();
    },
  });
  const rl = createInterface({ input, output: echo, terminal: true });

  return {
    async ask(prompt, hidden = false) {
      // question() écrit l'invite immédiatement ; on coupe l'écho seulement ensuite.
      const answer = rl.question(prompt);
      muted = hidden;
      try {
        return await answer;
      } finally {
        muted = false;
        if (hidden) output.write("\n");
      }
    },
    close: () => rl.close(),
  };
}
