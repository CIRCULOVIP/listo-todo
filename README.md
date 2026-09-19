# Listo — to do compartido del equipo

React + Vite + Supabase (Auth con magic link + Postgres Realtime).

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # completar con las keys del proyecto Supabase
npm run dev
```

## Acceso

Solo entra quien fue invitado por un admin (panel "Invitar al equipo" dentro de la app,
visible para los emails marcados `is_admin` en la tabla `listo_profiles`). El login es
sin contraseña: se manda un link mágico por email.

## Infraestructura

- **Supabase**: proyecto `casinoprobado` (tablas `listo_profiles` y `listo_tasks`,
  prefijadas para no chocar con las tablas del casino) + edge function `listo-invite`.
- **Deploy**: Vercel, proyecto conectado a este repo.

### Paso manual único después del deploy

En el dashboard de Supabase → **Authentication → URL Configuration**, agregar la URL
de producción de Vercel a "Site URL" y a "Redirect URLs". Sin esto, los links de
invitación/login pueden redirigir a una URL equivocada.
