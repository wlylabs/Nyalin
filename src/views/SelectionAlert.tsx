import { InlineAlert } from '../components/InlineAlert';
import { ERROR_COPY } from '../content/errors';
import type { NyalinErrorCode } from '../services/ocr';

/** Error saat memilih file (format/ukuran) ditampilkan di tempat, tanpa meninggalkan layar. */
export function SelectionAlert({ code }: { code: NyalinErrorCode }) {
  const copy = ERROR_COPY[code];
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
