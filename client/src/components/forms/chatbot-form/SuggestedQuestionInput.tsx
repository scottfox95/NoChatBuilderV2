import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { CommonMessage } from "@shared/schema";

type Props = { 
  question: string; 
  onChange: (v: string) => void;
  onSaveAsCommon?: (text: string) => void;
};

export default function SuggestedQuestionInput({ question, onChange, onSaveAsCommon }: Props) {
  const [saveIt, setSaveIt] = useState(false);
  const { user } = useAuth();

  // Fetch common FAQ messages
  const { data: commonMessages = [] } = useQuery<CommonMessage[]>({
    queryKey: [`/api/common-messages/${user?.id}`],
    enabled: !!user?.id,
  });

  const faqMessages = commonMessages
    .filter(msg => msg.kind === 'faq')
    .map(msg => msg.text);

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value) onChange(e.target.value);
  };

  const handleSaveToggle = (checked: boolean) => {
    setSaveIt(checked);
    if (checked && question.trim() && onSaveAsCommon) {
      onSaveAsCommon(question.trim());
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
        {faqMessages.map((q) => (
          <option key={q} value={q}>
            {q.slice(0, 60)}{q.length > 60 ? '...' : ''}
          </option>
        ))}
      </select>

      <input
        className="w-full bg-neutral-800 border border-neutral-700 rounded-md py-2 px-3 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        value={question}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Will I need to stay in the hospital?"
      />

      <label className="inline-flex items-center gap-2 text-sm text-neutral-400">
        <input
          type="checkbox"
          checked={saveIt}
          onChange={(e) => handleSaveToggle(e.target.checked)}
          className="rounded border-neutral-600 bg-neutral-800 text-primary focus:ring-primary focus:ring-2"
        />
        Save this as a common question
      </label>
    </div>
  );
}