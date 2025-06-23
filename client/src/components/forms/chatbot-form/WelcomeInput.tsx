import { useEffect, useState } from "react";
import { loadCommon, saveCommon } from "@/utils/commonPrompts";

type Props = { 
  value: string; 
  onChange: (v: string) => void;
  onSaveAsCommon?: (text: string) => void;
};

export default function WelcomeInput({ value, onChange, onSaveAsCommon }: Props) {
  const [saveIt, setSaveIt] = useState(false);
  const { user } = useAuth();

  // Fetch common welcome messages
  const { data: commonMessages = [] } = useQuery<CommonMessage[]>({
    queryKey: ['/api/common-messages', user?.id],
    enabled: !!user?.id,
  });

  const welcomeMessages = commonMessages
    .filter(msg => msg.kind === 'welcome')
    .map(msg => msg.text);

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value) onChange(e.target.value);
  };

  const handleSaveToggle = (checked: boolean) => {
    setSaveIt(checked);
    if (checked && value.trim() && onSaveAsCommon) {
      onSaveAsCommon(value.trim());
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
        <option value="">– choose common welcome message –</option>
        {welcomeMessages.map((msg) => (
          <option key={msg} value={msg}>
            {msg.slice(0, 60)}{msg.length > 60 ? '...' : ''}
          </option>
        ))}
      </select>

      <textarea
        className="w-full bg-neutral-800 border border-neutral-700 rounded-md py-2 px-3 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Hi there! I'm Dr. Bradley's ACL Reconstruction Care Aid…"
      />

      <label className="inline-flex items-center gap-2 text-sm text-neutral-400">
        <input
          type="checkbox"
          checked={saveIt}
          onChange={(e) => handleSaveToggle(e.target.checked)}
          className="rounded border-neutral-600 bg-neutral-800 text-primary focus:ring-primary focus:ring-2"
        />
        Save this as a common welcome message
      </label>
    </div>
  );
}