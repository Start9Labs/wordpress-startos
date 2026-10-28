import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '7.1.3:0',
  releaseNotes: {
    en_US:
      'Updates WordPress to 7.1.3, which includes the security fixes from every release since 7.0, and stops trusting certificates from a compromised certificate authority (eMudhra). Existing sites are upgraded on the next start, and core files the new release no longer ships are removed from them.',
    es_ES:
      'Actualiza WordPress a 7.1.3, que incluye las correcciones de seguridad de todas las versiones desde la 7.0, y deja de confiar en los certificados de una autoridad de certificación comprometida (eMudhra). Los sitios existentes se actualizan en el próximo inicio y se eliminan de ellos los archivos del núcleo que la nueva versión ya no incluye.',
    de_DE:
      'Aktualisiert WordPress auf 7.1.3, das die Sicherheitskorrekturen aller Versionen seit 7.0 enthält, und vertraut Zertifikaten einer kompromittierten Zertifizierungsstelle (eMudhra) nicht mehr. Bestehende Sites werden beim nächsten Start aktualisiert, und Core-Dateien, die die neue Version nicht mehr enthält, werden aus ihnen entfernt.',
    pl_PL:
      'Aktualizuje WordPress do wersji 7.1.3, która zawiera poprawki bezpieczeństwa ze wszystkich wydań od 7.0, i przestaje ufać certyfikatom przejętego urzędu certyfikacji (eMudhra). Istniejące witryny są aktualizowane przy następnym uruchomieniu, a pliki rdzenia, których nowe wydanie już nie zawiera, są z nich usuwane.',
    fr_FR:
      'Met à jour WordPress vers la version 7.1.3, qui inclut les correctifs de sécurité de toutes les versions depuis la 7.0, et ne fait plus confiance aux certificats d’une autorité de certification compromise (eMudhra). Les sites existants sont mis à niveau au prochain démarrage, et les fichiers du cœur que la nouvelle version ne fournit plus en sont supprimés.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
