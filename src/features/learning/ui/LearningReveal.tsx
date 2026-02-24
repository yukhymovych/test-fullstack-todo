import { useState } from 'react';
import { Button } from '@/shared/ui';
import { LearningRevealRichContent } from './LearningRevealRichContent';

export interface LearningRevealProps {
  title: string;
  content: string;
  richContent?: unknown;
  noteTitlesMap?: Map<string, string>;
  contentKey?: string;
}

export function LearningReveal({
  title,
  content,
  richContent,
  noteTitlesMap = new Map(),
  contentKey = '',
}: LearningRevealProps) {
  const [revealed, setRevealed] = useState(false);

  if (richContent !== undefined && richContent !== null) {
    return (
      <LearningRevealRichContent
        title={title}
        richContent={richContent}
        noteTitlesMap={noteTitlesMap}
        revealed={revealed}
        onReveal={() => setRevealed(true)}
        contentKey={contentKey}
      />
    );
  }

  return (
    <div className="learning-reveal">
      <h2 className="learning-reveal__title">{title}</h2>
      {!revealed ? (
        <Button
          variant="secondary"
          onClick={() => setRevealed(true)}
          className="learning-reveal__show-btn"
        >
          Show Answer
        </Button>
      ) : (
        <div className="learning-reveal__content">{content || '(No content)'}</div>
      )}
    </div>
  );
}
