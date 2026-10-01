import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { IImageStorage } from "@/shared/domain/IImageStorage";

export interface ConfigR2 {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl: string;
}

const CACHE_INMUTABLE = "public, max-age=31536000, immutable";

// Almacenamiento sobre Cloudflare R2 (API compatible con S3). Regla 16: clave única y caché inmutable.
export class CloudflareImageService implements IImageStorage {
  private readonly cliente: Pick<S3Client, "send">;

  constructor(
    private readonly config: ConfigR2,
    cliente?: Pick<S3Client, "send">,
  ) {
    this.cliente =
      cliente ??
      new S3Client({
        region: "auto",
        endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
        // R2 no admite los checksums adicionales que el SDK agrega por defecto.
        requestChecksumCalculation: "WHEN_REQUIRED",
        responseChecksumValidation: "WHEN_REQUIRED",
      });
  }

  async guardar(clave: string, contenido: Buffer): Promise<void> {
    await this.cliente.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: clave,
        Body: contenido,
        ContentType: "image/webp",
        CacheControl: CACHE_INMUTABLE,
      }),
    );
  }

  async borrar(clave: string): Promise<void> {
    await this.cliente.send(new DeleteObjectCommand({ Bucket: this.config.bucket, Key: clave }));
  }

  urlPublica(clave: string): string {
    return `${this.config.publicUrl}/${clave}`;
  }
}
