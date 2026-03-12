# Deploy eWróżka

## Automatyczny deploy (GitHub Actions)

### Wymagane konfiguracje na GitHubie

1. **Settings → Environments** (już utworzone: `staging`, `production`)

2. **Sekrety na poziomie repozytorium** (Settings → Secrets and variables → Actions):
   - `VPS_HOST` – IP serwera (np. `51.xxx.xxx.xxx`)
   - `VPS_USER` – użytkownik SSH (np. `deploy`)
   - `VPS_SSH_KEY` – zawartość pliku `~/.ssh/id_rsa` (klucz prywatny)

3. **Sekret ENV_FILE w każdym środowisku**:
   - W środowisku **staging**: dodaj sekret `ENV_FILE` z całą zawartością pliku `.env.staging`
   - W środowisku **production**: dodaj sekret `ENV_FILE` z całą zawartością pliku `.env.production`

   Źródło treści: skopiuj z `deploy/env.staging.example` / `deploy/env.production.example`, uzupełnij prawdziwymi wartościami i wklej do sekretu `ENV_FILE` w odpowiednim środowisku.

### Jak działa deploy

- **Staging**: po pushu na `develop`, gdy CI zakończy się sukcesem, deploy odpala się automatycznie.
- **Production**: po pushu na `main`, gdy CI zakończy się sukcesem, deploy odpala się automatycznie.
- **Ręcznie**: w Actions → Deploy Staging / Deploy Production → „Run workflow”.

### Przebieg deployu

1. Zapisanie `ENV_FILE` na serwerze jako `.env.staging` / `.env.production`
2. `git pull`
3. `docker compose build`
4. Uruchomienie migracji bazy danych
5. `docker compose up -d`

### Ścieżka projektu na serwerze

Skrypt zakłada katalog `/opt/ewrozka`. Jeśli używasz innej ścieżki (np. `/opt/ewrozka/ewrozka`), zmień ją w workflowach w `.github/workflows/deploy-staging.yml` i `deploy-prod.yml`.
