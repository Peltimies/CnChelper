interface SpellDescriptionProps {
  text: string;
  className?: string;
}

function renderBold(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-parchment-900">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export default function SpellDescription({ text, className = '' }: SpellDescriptionProps) {
  const paragraphs = text.split(/\n+/).filter((p) => p.trim());
  return (
    <div className={`space-y-2 ${className}`}>
      {paragraphs.map((para, i) => (
        <p key={i} className="text-sm text-parchment-800 font-body leading-relaxed">
          {renderBold(para.trim())}
        </p>
      ))}
    </div>
  );
}
