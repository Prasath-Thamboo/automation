/**
 * Textes adressés aux clients du patron par les canaux (voix, SMS). Ils parlent
 * au nom de l'établissement, jamais de Tando.
 */

export function missedCallSms(establishment: string): string {
  return (
    `Bonjour, ici ${establishment}. Désolé de ne pas avoir pu décrocher. ` +
    `Répondez à ce SMS avec votre demande : on s'en occupe tout de suite.`
  );
}

export function callMessage(establishment: string, smsFollows: boolean): string {
  return smsFollows
    ? `Bonjour, vous êtes bien chez ${establishment}. Nous ne pouvons pas vous répondre pour le moment. ` +
        `Nous vous envoyons un SMS à l'instant pour prendre votre demande par écrit. À tout de suite.`
    : `Bonjour, vous êtes bien chez ${establishment}. Nous ne pouvons pas vous répondre pour le moment. ` +
        `Votre appel est noté, nous vous rappelons dès que possible.`;
}

export const CALL_UNAVAILABLE =
  "Bonjour, ce numéro n'est pas disponible pour le moment. Merci de rappeler plus tard.";
