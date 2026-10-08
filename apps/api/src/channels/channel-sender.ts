import type { ChannelEndpoint, ChannelKind } from "@prisma/client";

/**
 * Remise d'un message au client final par un canal (Lot 12). Une
 * implémentation par fournisseur ; aucune règle métier ici.
 */
export const CHANNEL_SENDERS = Symbol("CHANNEL_SENDERS");

export interface OutboundMessage {
  endpoint: ChannelEndpoint;
  /** Adresse de réponse en clair (numéro E.164, email, identifiant Meta). */
  to: string;
  text: string;
  /** Nom affiché de l'établissement (expéditeur email, signature). */
  senderName: string;
  /** Fil côté canal (`Conversation.threadMeta`). */
  thread: Record<string, string> | null;
}

export interface ChannelSender {
  readonly kinds: readonly ChannelKind[];
  /** Renvoie la référence fournisseur du message envoyé. */
  send(msg: OutboundMessage): Promise<{ ref: string | null }>;
}

/** Échec définitif : inutile de réessayer (destinataire invalide, fenêtre fermée…). */
export class PermanentDeliveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermanentDeliveryError";
  }
}
