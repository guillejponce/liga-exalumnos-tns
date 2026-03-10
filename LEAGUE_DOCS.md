🏆 Liga Nico Sabag – Web Platform

Plataforma web para la gestión y visualización de la Liga Nico Sabag (Liga de Exalumnos).

Stack principal:

Next.js 15 (App Router, TypeScript)

Supabase (Postgres + Auth + Storage + RLS)

Arquitectura monolítica (front + server actions en el mismo proyecto)

🏗 Arquitectura General

La aplicación es un monolito Next.js que:

Usa Supabase como:

Base de datos (Postgres)

Sistema de autenticación

Storage (escudos y fotos)

Usa Server Actions para escrituras.

Usa RLS (Row Level Security) para control de permisos.

No existe backend separado.
Next.js actúa como:

Front público

Panel de administración

Backend lógico (server actions)

🧠 Modelo Conceptual
Liga

Una liga contiene:

Equipos

Jugadores

Temporadas (semestres)

Competencias y etapas

Partidos

Temporadas (Semestres)

Una temporada representa un torneo de semestre.

Ejemplo:

2026 – Semestre 1

2026 – Semestre 2

Cada temporada puede tener:

Competencias

Etapas (liga, grupos, playoffs)

📊 Modelo de Base de Datos (Resumen)
leagues

Liga principal.

Campo	Tipo
id	uuid
name	text
slug	text único
seasons

Representa un torneo por semestre.

Campo	Tipo
id	uuid
league_id	uuid
name	text
year	int
semester	int (1 o 2)

Unique:
(league_id, year, semester)

league_memberships

Controla roles de usuarios en una liga.

Campo	Tipo
league_id	uuid
user_id	uuid
role	owner / admin / editor / viewer

Permisos:

owner → control total

admin → gestión completa

editor → carga equipos/jugadores/partidos

viewer → solo lectura admin

teams

Equipos de la liga.

Campo	Tipo
id	uuid
league_id	uuid
name	text
short_name	text
crest_path	text
players

Jugadores.

Campos obligatorios:

first_name

rut

Campos opcionales:

last_name

nickname

photo_path

Restricción:

(league_id, rut) único

team_players (Plantel único)

El plantel NO depende de temporada.
Es global por equipo.

Campo	Tipo
team_id	uuid
player_id	uuid
shirt_number	int nullable
is_captain	boolean

Dorsal es opcional.

team_season

Inscripción de equipos a un semestre específico.

Un equipo puede participar o no en un semestre.

competitions

Competencias dentro de un semestre.

Ej:

Torneo Principal

Copa

stages

Etapas dentro de una competencia.

Tipos:

league_table

groups

knockout

Incluye campo:
rules (jsonb)

Permite flexibilidad total en formatos.

stage_groups

Grupos dentro de una etapa tipo "groups".

matches

Partidos.

Campo	Tipo
stage_id	uuid
group_id	uuid nullable
home_team_season_id	uuid
away_team_season_id	uuid
home_score	int
away_score	int
status	scheduled / played
round	int
kickoff_at	timestamptz
match_events

Eventos de partido:

goal

assist

yellow

red

🔐 Seguridad y Permisos (RLS)

Row Level Security está activado en todas las tablas.

Lectura pública:

leagues

seasons

teams

players

team_players

matches

Esto permite:

Ver equipos

Ver planteles

Ver tabla

Ver fixture

Escritura:

Solo usuarios con role:

owner

admin

editor

Validado mediante funciones SQL:

is_league_editor(league_id)

is_league_member(league_id)

🔑 Autenticación

Se usa Supabase Auth con:

Email Magic Link (OTP)

No existen “credenciales admin” separadas.
Un admin es:

Usuario autenticado

Con registro en league_memberships

🌐 Estructura del Proyecto Next.js

src/
app/
(public)/
page.tsx
tabla/
fixture/
equipos/
(admin)/
admin/
login/
layout.tsx
actions/
lib/supabase/
types/

🗄 Supabase Setup

Variables de entorno:

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

Opcional (solo server-side):
SUPABASE_SERVICE_ROLE_KEY=

Nunca exponer service role en cliente.

⚙️ Flujo MVP

Crear liga

Crear temporada (year + semester)

Inscribir equipos (team_season)

Definir competencia

Crear etapa

Crear partidos

Registrar resultados

Mostrar tabla pública

📌 Reglas importantes del dominio

El plantel es único por equipo (no depende de semestre).

Las dorsales son opcionales.

RUT es obligatorio y único por liga.

Un equipo puede no participar en un semestre.

El formato del torneo es flexible vía stages.

🤖 Notas para IA / Desarrollo Asistido

Este proyecto:

Usa Supabase con RLS estricta.

No debe usar service role en cliente.

Toda escritura debe respetar roles.

Las consultas públicas deben ser eficientes.

El modelo permite múltiples formatos de torneo dinámicos.

Si se generan nuevas tablas:

Deben habilitar RLS.

Deben tener policies claras.

Deben respetar el modelo de liga → temporada → competencia → stage.

🚀 Futuras mejoras

Standings calculados vía view SQL

Trigger para cache de tabla

Bracket dinámico playoffs

Estadísticas por jugador

Multi-liga