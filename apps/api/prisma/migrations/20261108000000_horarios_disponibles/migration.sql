CREATE TABLE "horarios_disponibles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "espacio_id" UUID NOT NULL,
    "dia_semana" INTEGER NOT NULL,
    "hora_inicio" TIME(0) NOT NULL,
    "hora_fin" TIME(0) NOT NULL,
    CONSTRAINT "horarios_disponibles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "horarios_dia_valido" CHECK ("dia_semana" BETWEEN 1 AND 7),
    CONSTRAINT "horarios_rango_valido" CHECK ("hora_fin" > "hora_inicio")
);
CREATE UNIQUE INDEX "horarios_disponibles_espacio_id_dia_semana_hora_inicio_hora_fin_key"
  ON "horarios_disponibles"("espacio_id", "dia_semana", "hora_inicio", "hora_fin");
CREATE INDEX "horarios_disponibles_espacio_id_dia_semana_idx"
  ON "horarios_disponibles"("espacio_id", "dia_semana");
ALTER TABLE "horarios_disponibles" ADD CONSTRAINT "horarios_disponibles_espacio_id_fkey"
  FOREIGN KEY ("espacio_id") REFERENCES "espacios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
