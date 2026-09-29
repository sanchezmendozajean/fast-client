# Publicar Fast Client

## 1. Carpeta de workflows

No pude crear `.github` directamente (es una carpeta protegida para mis herramientas). En la carpeta del proyecto, renombra `mover-a-.github` a `.github`:

```powershell
cd "C:\Coding\Fast Client"
ren mover-a-.github .github
```

## 2. Instalar y probar

```powershell
npm install
npm run typecheck; npm run lint; npm test
npm run dev        # abre Preferencias → Actualizaciones para verlo
```

## 3. Preparar GitHub

1. *(Opcional, respaldo del historial viejo)* Mueve la carpeta oculta `.git` del proyecto fuera de él, por ejemplo a `Documentos\fast-client-historial-viejo\.git`.
2. En GitHub, borra el repo actual: **Settings → General → Danger Zone → Delete this repository**.
3. Crea un repo **nuevo, público y vacío** llamado `fast-client`. No marques README ni licencia.
4. En **github.com/settings/emails**, activa *Keep my email addresses private* y copia tu correo `…@users.noreply.github.com`.

## 4. Historial nuevo con tu identidad personal

```powershell
cd "C:\Coding\Fast Client"
Remove-Item -Recurse -Force .git      # solo si no lo moviste en el paso 3.1
git init -b main

# Sin --global: aplica solo a este repositorio, no toca tu configuración del trabajo
git config user.name "Jean Sánchez Mendoza"
git config user.email "53634782+sanchezmendozajean@users.noreply.github.com"

git add -A
git status            # revisa que no haya nada inesperado antes de seguir
git commit -m "Fast Client 0.1.0"
git remote add origin git@github.com:sanchezmendozajean/fast-client.git
git push -u origin main
```

Comprueba la identidad con `git config user.email` dentro de la carpeta: debe mostrar el correo `noreply`. Fuera de ella seguirá saliendo el del trabajo.

## 5. Página web

En el repo nuevo: **Settings → Pages → Source: GitHub Actions**. El workflow *Pages* se ejecuta solo y publica en
https://sanchezmendozajean.github.io/fast-client/

## 6. Primer release

```powershell
git tag v0.1.0
git push origin v0.1.0
```

En la pestaña **Actions** verás *Release* compilando en Windows. Al terminar, el instalador aparece en **Releases** y el botón de la página empieza a descargarlo directamente.

**Siguientes versiones:** sube `version` en `package.json`, haz commit y crea el tag con la misma versión (`v0.2.0`). Las apps instaladas se actualizan solas.
