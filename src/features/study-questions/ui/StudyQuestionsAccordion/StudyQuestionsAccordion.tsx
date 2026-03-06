import { RiArrowDownSLine } from 'react-icons/ri';
import type { StudyQuestionsAccordionProps } from '../StudyQuestionsAnswersBlock/StudyQuestionsAnswersBlock.types';
import './StudyQuestionsAccordion.css';

export function StudyQuestionsAccordion({ pairs }: StudyQuestionsAccordionProps) {
  if (pairs.length === 0) return null;

  return (
    <section className="study-qa-accordion">
      <h3 className="study-qa-accordion__title">Questions and Answers</h3>
      <div className="study-qa-accordion__list">
        {pairs.map((pair) => (
          <details key={pair.id} className="study-qa-accordion__item">
            <summary className="study-qa-accordion__question">
              <span className="study-qa-accordion__chevron" aria-hidden>
                <RiArrowDownSLine />
              </span>
              {pair.question}
            </summary>
            <p className="study-qa-accordion__answer">{pair.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
