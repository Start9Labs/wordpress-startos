import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '7.1.3:0',
  releaseNotes: {
    en_US:
      'Updates WordPress to 7.1.3, which includes the security fixes from every release since 7.0, and PHP to 8.3.36, which fixes two remote code execution vulnerabilities (CVE-2026-109618, CVE-2026-109619). Existing sites are upgraded on the next start, and core files the new release no longer ships are removed from them.',
    es_ES:
      'Actualiza WordPress a 7.1.3, que incluye las correcciones de seguridad de todas las versiones desde la 7.0, y PHP a 8.3.36, que corrige dos vulnerabilidades de ejecución remota de código (CVE-2026-109618, CVE-2026-109619). Los sitios existentes se actualizan en el próximo inicio y se eliminan de ellos los archivos del núcleo que la nueva versión ya no incluye.',
    de_DE:
      'Aktualisiert WordPress auf 7.1.3, das die Sicherheitskorrekturen aller Versionen seit 7.0 enthält, und PHP auf 8.3.36, das zwei Schwachstellen zur Remote-Codeausführung behebt (CVE-2026-109618, CVE-2026-109619). Bestehende Sites werden beim nächsten Start aktualisiert, und Core-Dateien, die die neue Version nicht mehr enthält, werden aus ihnen entfernt.',
    pl_PL:
      'Aktualizuje WordPress do wersji 7.1.3, która zawiera poprawki bezpieczeństwa ze wszystkich wydań od 7.0, oraz PHP do wersji 8.3.36, która usuwa dwie luki umożliwiające zdalne wykonanie kodu (CVE-2026-109618, CVE-2026-109619). Istniejące witryny są aktualizowane przy następnym uruchomieniu, a pliki rdzenia, których nowe wydanie już nie zawiera, są z nich usuwane.',
    fr_FR:
      'Met à jour WordPress vers la version 7.1.3, qui inclut les correctifs de sécurité de toutes les versions depuis la 7.0, et PHP vers la version 8.3.36, qui corrige deux vulnérabilités d’exécution de code à distance (CVE-2026-109618, CVE-2026-109619). Les sites existants sont mis à niveau au prochain démarrage, et les fichiers du cœur que la nouvelle version ne fournit plus en sont supprimés.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
