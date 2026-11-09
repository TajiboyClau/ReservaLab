CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE "usuarios" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nombre" VARCHAR(120) NOT NULL,
    "correo" VARCHAR(255) NOT NULL,
    "contrasena_hash" TEXT NOT NULL,
    "rol" VARCHAR(20) NOT NULL DEFAULT 'estudiante',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "usuarios_rol_valido" CHECK ("rol" IN ('estudiante', 'docente', 'administrador'))
);

CREATE TABLE "espacios" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nombre" VARCHAR(120) NOT NULL,
    "edificio" VARCHAR(120) NOT NULL,
    "tipo" VARCHAR(20) NOT NULL,
    "capacidad" INTEGER NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "espacios_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "espacios_tipo_valido" CHECK ("tipo" IN ('laboratorio', 'salon')),
    CONSTRAINT "espacios_capacidad_positiva" CHECK ("capacidad" > 0)
);

CREATE TABLE "reservas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "espacio_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "grupo" VARCHAR(120),
    "proposito" VARCHAR(250) NOT NULL,
    "inicio" TIMESTAMPTZ(6) NOT NULL,
    "fin" TIMESTAMPTZ(6) NOT NULL,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'activa',
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelada_en" TIMESTAMPTZ(6),
    CONSTRAINT "reservas_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "reservas_rango_valido" CHECK ("fin" > "inicio"),
    CONSTRAINT "reservas_estado_valido" CHECK ("estado" IN ('activa', 'cancelada')),
    CONSTRAINT "reservas_cancelacion_coherente" CHECK (
      ("estado" = 'activa' AND "cancelada_en" IS NULL) OR
      ("estado" = 'cancelada' AND "cancelada_en" IS NOT NULL)
    ),
    CONSTRAINT "reservas_sin_traslape" EXCLUDE USING GIST (
      "espacio_id" WITH =,
      tstzrange("inicio", "fin", '[)') WITH &&
    ) WHERE ("estado" = 'activa')
);

CREATE TABLE "tokens_actualizacion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "vence_en" TIMESTAMPTZ(6) NOT NULL,
    "revocado_en" TIMESTAMPTZ(6),
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tokens_actualizacion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "claves_api" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nombre" VARCHAR(120) NOT NULL,
    "prefijo" VARCHAR(20) NOT NULL,
    "clave_hash" TEXT NOT NULL,
    "permisos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "ultimo_uso_en" TIMESTAMPTZ(6),
    "revocada_en" TIMESTAMPTZ(6),
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "claves_api_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "usuarios_correo_key" ON "usuarios"("correo");
CREATE INDEX "espacios_edificio_capacidad_idx" ON "espacios"("edificio", "capacidad");
CREATE INDEX "reservas_espacio_id_inicio_fin_idx" ON "reservas"("espacio_id", "inicio", "fin");
CREATE INDEX "reservas_usuario_id_inicio_idx" ON "reservas"("usuario_id", "inicio");
CREATE INDEX "tokens_actualizacion_usuario_id_idx" ON "tokens_actualizacion"("usuario_id");
CREATE UNIQUE INDEX "tokens_actualizacion_token_hash_key" ON "tokens_actualizacion"("token_hash");
CREATE UNIQUE INDEX "claves_api_clave_hash_key" ON "claves_api"("clave_hash");

ALTER TABLE "reservas" ADD CONSTRAINT "reservas_espacio_id_fkey"
  FOREIGN KEY ("espacio_id") REFERENCES "espacios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_usuario_id_fkey"
  FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tokens_actualizacion" ADD CONSTRAINT "tokens_actualizacion_usuario_id_fkey"
  FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
