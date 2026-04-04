import type { NotesSliderSectionProps } from './NotesSliderSection.types';
import { useTranslation } from 'react-i18next';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/shared/ui';
import './NotesSliderSection.css';

export function NotesSliderSection({
  title,
  icon: Icon,
  titleSuffix,
  notes,
  formattedTimes,
  renderMeta,
  onNoteClick,
}: NotesSliderSectionProps) {
  const { t } = useTranslation('notes');

  if (notes.length === 0) return null;

  return (
    <section className="notes-slider-section">
      <h2 className="notes-slider-section__title">
        <Icon className="notes-slider-section__title-icon size-4" />
        {title}
        {titleSuffix}
      </h2>
      <Carousel
        dir="ltr"
        opts={{ align: 'start', direction: 'ltr', loop: false, startIndex: 0, slidesToScroll: 2 }}
        className="notes-slider-section__carousel"
      >
        <CarouselContent
          dir="ltr"
          className="notes-slider-section__content"
        >
          {notes.map((note) => (
            <CarouselItem key={note.id} className="notes-slider-section__item">
              <button
                type="button"
                className="notes-slider-section__card"
                onClick={() => onNoteClick(note.id)}
              >
                <div className="notes-slider-section__card-title">
                  {note.title || t('untitled')}
                </div>
                <div className="notes-slider-section__card-meta">
                  {renderMeta ? renderMeta(note.id) : (formattedTimes.get(note.id) ?? '')}
                </div>
              </button>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="notes-slider-section__nav" />
        <CarouselNext className="notes-slider-section__nav" />
      </Carousel>
    </section>
  );
}
