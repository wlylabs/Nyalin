import { InlineAlert } from '../components/InlineAlert';
import { getErrorCopy } from '../content/errors';
import type { NyalinErrorCode } from '../services/errors';
import type { MediaKind } from '../lib/media';

/** Error saat memilih file / merekam ditampilkan di tempat, tanpa meninggalkan layar. */
export function SelectionAlert({ code, kind }: { code: NyalinErrorCode; kind: MediaKind }) {
  const copy = getErrorCopy(code, kind);
  return (
    <InlineAlert title={copy.title}>
      <p>{copy.description}</p>
      {copy.tips && (
        <ul>
          {copy.tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      )}
    </InlineAlert>
  );
}
