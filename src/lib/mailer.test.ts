import { describe, expect, it, vi } from "vitest";
import {
  MailDeliveryError,
  createResendMailer,
  type MailMessage,
} from "@/lib/mailer";

const API_KEY = "re_cle_factice_ne_doit_jamais_fuiter";

const message: MailMessage = {
  from: "Portfolio <contact@domaine.fr>",
  to: "moi@domaine.fr",
  replyTo: "visiteur@exemple.fr",
  subject: "Sujet",
  html: "<p>Bonjour</p>",
  text: "Bonjour",
};

function fakeFetch(response: Response | Error) {
  return vi.fn<typeof fetch>(async () => {
    if (response instanceof Error) throw response;
    return response;
  });
}

describe("createResendMailer", () => {
  it("appelle l'API Resend avec la clé, le Reply-To et les deux versions", async () => {
    const fetch = fakeFetch(Response.json({ id: "abc" }, { status: 200 }));
    await createResendMailer({ apiKey: API_KEY, fetch }).send(message);

    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe("https://api.resend.com/emails");
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("authorization")).toBe(
      `Bearer ${API_KEY}`,
    );
    expect(JSON.parse(String(init?.body))).toEqual({
      from: message.from,
      to: [message.to],
      reply_to: message.replyTo,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
  });

  it("signale un refus du fournisseur sans divulguer la clé", async () => {
    const fetch = fakeFetch(
      Response.json(
        { name: "validation_error", message: `clé ${API_KEY} refusée` },
        { status: 422 },
      ),
    );
    const error = await createResendMailer({ apiKey: API_KEY, fetch })
      .send(message)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(MailDeliveryError);
    expect(error).toMatchObject({
      status: 422,
      providerError: "validation_error",
    });
    expect(String((error as Error).message)).not.toContain(API_KEY);
    expect(JSON.stringify(error)).not.toContain(API_KEY);
  });

  it("ignore un corps d'erreur non conforme", async () => {
    const fetch = fakeFetch(new Response("<html>502</html>", { status: 502 }));
    await expect(
      createResendMailer({ apiKey: API_KEY, fetch }).send(message),
    ).rejects.toMatchObject({ status: 502, providerError: null });
  });

  it("transforme une erreur réseau en MailDeliveryError neutre", async () => {
    const fetch = fakeFetch(new Error(`échec avec Bearer ${API_KEY}`));
    const error = await createResendMailer({ apiKey: API_KEY, fetch })
      .send(message)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(MailDeliveryError);
    expect((error as MailDeliveryError).status).toBeNull();
    expect((error as Error).message).not.toContain(API_KEY);
  });
});
