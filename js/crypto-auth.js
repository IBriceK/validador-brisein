// Módulo Criptográfico Oficial - Academia BRISEIN LTDA.
// Firma digital asimétrica ECDSA P-256 (Web Crypto API) para emisión y verificación infalsificable de certificados.

const BRISEIN_PRIVATE_KEY_JWK = {
  "key_ops": ["sign"],
  "ext": true,
  "kty": "EC",
  "x": "X2lRYmPh1QklcWNL0ABuzk8FuAhrCVcGUOVRDij8hcE",
  "y": "XNol6jrP8s_rd2w-JbwL1B0oSSQSaBelJzTJBZIo8yg",
  "crv": "P-256",
  "d": "AEvNH_E9Wko1MQ8Z6J_f01YOYN5IepKpq65tm3bndCg"
};

const BRISEIN_PUBLIC_KEY_JWK = {
  "key_ops": ["verify"],
  "ext": true,
  "kty": "EC",
  "x": "X2lRYmPh1QklcWNL0ABuzk8FuAhrCVcGUOVRDij8hcE",
  "y": "XNol6jrP8s_rd2w-JbwL1B0oSSQSaBelJzTJBZIo8yg",
  "crv": "P-256"
};

// LISTA BLANCA OFICIAL DE CERTIFICADOS PREVIAMENTE EMITIDOS
// Cualquier certificado en esta lista es validado automáticamente con retrocompatibilidad 100%.
const LEGACY_WHITELIST = new Set([
  // 1) José Benavides Castro (Encargado de Seguridad - 200h)
  'WyI2LjM3My44ODktMSIsIkpvc8OpIEJlbmF2aWRlcyBDYXN0cm8iLCIxMjM4MDc3NjA3IiwiMS02LTI2IiwiMzAtNi0yNiIsIjA2LTA3LTIwMjYiLCIiLCIiLDIwMCwiRU5DQVJHQURPIERFIFNFR1VSSURBRCIsIkxleSBOwrogMjEuNjU5IHNvYnJlIFNlZ3VyaWRhZCBQcml2YWRhIC0gRMK6MjA5IGRlIGxhIFN1YnNlY3JldGFyw61hIGRlIFByZXZlbmNpw7NuIGRlbCBEZWxpdG8gLSBTLlAuRCJd',
  
  // 2) Rosa Kramarenco Pastene (Encargado de Seguridad)
  'WyI3LjkwNS44NDktMSIsIlJvc2EgS3JhbWFyZW5jbyBQYXN0ZW5lIiwiMTIzODA3NzYwNyIsIjE2LTAyLTIwMjYiLCIxMi0wMy0yMDI2IiwiMDYtMDQtMjAyNiIsIiIsIiJd',
  
  // 3) Dorian Espinoza Sánchez (Técnicas en Cajeros Automáticos - 60h)
  'WyIyMy44MDEuNjcxLTEiLCJEb3JpYW4gRXNwaW5vemEgU8OhbmNoZXoiLCIxMjM3OTA0MDg1IiwiMjAtMDctMjAyNiIsIjMxLTA3LTIwMjYiLCIyNS0wOC0yMDI2IiwiVFJBTlNQT1JURVMgVFJBTlNSVVQgIExJTUlUQURBIiwiNzYuMzg4Ljg0MC0xIl0='
]);

function getSubtleCrypto() {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    return window.crypto.subtle;
  }
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) {
    return globalThis.crypto.subtle;
  }
  if (typeof require !== 'undefined') {
    try {
      return require('crypto').webcrypto.subtle;
    } catch (e) {}
  }
  return null;
}

// -------------------------------------------------------------
// MOTOR DE FIRMA (Para el Generador)
// -------------------------------------------------------------
class BriseinCrypto {
  static cachedPrivateKey = null;

  static async getPrivateKey() {
    if (this.cachedPrivateKey) return this.cachedPrivateKey;
    const subtle = getSubtleCrypto();
    if (!subtle) return null;
    this.cachedPrivateKey = await subtle.importKey(
      'jwk',
      BRISEIN_PRIVATE_KEY_JWK,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );
    return this.cachedPrivateKey;
  }

  static async signCertificateTuple(tuple) {
    const subtle = getSubtleCrypto();
    const privKey = await this.getPrivateKey();
    if (!subtle || !privKey) {
      console.warn('Web Crypto API no disponible.');
      return '';
    }

    const payloadString = JSON.stringify(tuple);
    const dataBuffer = new TextEncoder().encode(payloadString);
    const signatureBuffer = await subtle.sign(
      { name: 'ECDSA', hash: { name: 'SHA-256' } },
      privKey,
      dataBuffer
    );

    const bytes = new Uint8Array(signatureBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  static async buildSignedPayload(tuple) {
    const signature = await this.signCertificateTuple(tuple);
    const envelope = signature ? [tuple, signature] : tuple;
    const jsonStr = JSON.stringify(envelope);
    const utf8Bytes = unescape(encodeURIComponent(jsonStr));
    return btoa(utf8Bytes)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
}

// -------------------------------------------------------------
// MOTOR DE VERIFICACIÓN (Para el Validador Web Público)
// -------------------------------------------------------------
class BriseinValidatorCrypto {
  static cachedPublicKey = null;

  static async getPublicKey() {
    if (this.cachedPublicKey) return this.cachedPublicKey;
    const subtle = getSubtleCrypto();
    if (!subtle) return null;
    this.cachedPublicKey = await subtle.importKey(
      'jwk',
      BRISEIN_PUBLIC_KEY_JWK,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    );
    return this.cachedPublicKey;
  }

  static base64UrlDecode(str) {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    return decodeURIComponent(escape(atob(base64)));
  }

  static base64UrlToBuffer(b64url) {
    let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) {
      b64 += '=';
    }
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  static async verifyPayload(rawPayload) {
    if (!rawPayload) {
      return { valid: false, reason: 'Parámetro de verificación vacío.' };
    }

    const trimmed = rawPayload.trim();

    // 1. Comprobación en Lista Blanca de Certificados Previos
    if (LEGACY_WHITELIST.has(trimmed)) {
      try {
        const jsonStr = this.base64UrlDecode(trimmed);
        const parsed = JSON.parse(jsonStr);
        return {
          valid: true,
          isLegacy: true,
          data: parsed
        };
      } catch (e) {
        return { valid: false, reason: 'Error al procesar certificado histórico.' };
      }
    }

    // 2. Decodificación del paquete
    let parsedEnvelope = null;
    try {
      const jsonStr = this.base64UrlDecode(trimmed);
      parsedEnvelope = JSON.parse(jsonStr);
    } catch (e) {
      return { valid: false, reason: 'El código QR no tiene un formato válido.' };
    }

    // 3. Verificación de firma criptográfica
    if (Array.isArray(parsedEnvelope) && parsedEnvelope.length === 2 && typeof parsedEnvelope[1] === 'string' && Array.isArray(parsedEnvelope[0])) {
      const [tupleData, signatureB64] = parsedEnvelope;
      
      const subtle = getSubtleCrypto();
      const pubKey = await this.getPublicKey();
      
      if (!subtle || !pubKey) {
        return { valid: false, reason: 'Motor de verificación no disponible.' };
      }

      try {
        const dataString = JSON.stringify(tupleData);
        const dataBuffer = new TextEncoder().encode(dataString);
        const signatureBuffer = this.base64UrlToBuffer(signatureB64);

        const isValidSig = await subtle.verify(
          { name: 'ECDSA', hash: { name: 'SHA-256' } },
          pubKey,
          signatureBuffer,
          dataBuffer
        );

        if (isValidSig) {
          return {
            valid: true,
            isLegacy: false,
            data: tupleData
          };
        } else {
          return {
            valid: false,
            reason: 'Firma digital no válida. El certificado ha sido alterado o no fue emitido por Academia BRISEIN.'
          };
        }
      } catch (err) {
        return { valid: false, reason: 'Error verificando la autenticidad de la firma.' };
      }
    }

    // 4. Si no tiene firma y no está en la lista blanca: RECHAZAR
    return {
      valid: false,
      reason: 'Certificado no registrado o adulterado. No cuenta con la firma digital oficial de Academia BRISEIN LTDA.'
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BriseinCrypto, BriseinValidatorCrypto, LEGACY_WHITELIST, BRISEIN_PRIVATE_KEY_JWK, BRISEIN_PUBLIC_KEY_JWK };
}
