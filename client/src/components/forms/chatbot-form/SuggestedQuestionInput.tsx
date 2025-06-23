import { useEffect, useState } from "react";
import { loadCommon, saveCommon } from "@/utils/commonPrompts";

type Props = { question: string; onChange: (v: string) => void };

export default function SuggestedQuestionInput({ question, onChange }: Props) {
  const [common, setCommon] = useState<string[]>([]);
  const [saveIt, setSaveIt] = useState(false);

  useEffect(() => setCommon(loadCommon("question")), []);

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value) onChange(e.target.value);
  };

  const handleBlur = () => {
    if (saveIt) {
      setCommon(saveCommon("question", question));
      setSaveIt(false);
    }
  };

  return (
    <div className="space-y-2">
      <select
        className="w-full bg-neutral-800 border border-neutral-700 rounded-md py-2 px-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        defaultValue=""
        onChange={handleSelect}
      >
        <option value="">– choose common question –</option>
        {common.map((q) => (
          <option key={q} value={q}>
            {q.slice(0, 60)}{q.length > 60 ? '...' : ''}
          </option>
        ))}
      </select>

      <input
        className="w-full bg-neutral-800 border border-neutral-700 rounded-md py-2 px-3 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        value={question}
        onChange={(e) => onChange(e.target.value)}
        onBlur={handleBlur}
        placeholder="Will I need to stay in the hospital?"
      />

      <label className="inline-flex items-center gap-2 text-sm text-neutral-400">
        <input
          type="checkbox"
          checked={saveIt}
          onChange={() => setSaveIt((s) => !s)}
          className="rounded border-neutral-600 bg-neutral-800 text-primary focus:ring-primary focus:ring-2"
        />
        Save this as a common question
      </label>
    </div>
  );
}