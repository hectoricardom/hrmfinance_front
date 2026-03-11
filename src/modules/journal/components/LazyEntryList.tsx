import { Component } from 'solid-js';
import { JournalEntry } from '../stores/entryBookStore';
import JournalEntryCard from './JournalEntryCard';
import { LazyList } from '../../ui';
import { useTranslation } from '../../../translations';

interface LazyEntryListProps {
  entries: JournalEntry[];
  onViewDetails: (entry: JournalEntry) => void;
  batchSize?: number;
}

const LazyEntryList: Component<LazyEntryListProps> = (props) => {
  const { t } = useTranslation();

  return (
    <LazyList
      items={props.entries}
      renderItem={(entry) => (
        <JournalEntryCard
          entry={entry}
          onViewDetails={props.onViewDetails}
        />
      )}
      batchSize={props.batchSize || 20}
      gridColumns="repeat(auto-fit, minmax(400px, 1fr))"
      gap="1.5rem"
      itemsLabel={t('entryBooks.entries', 'asientos')}
      emptyMessage={t('entryBooks.noEntries', 'No hay asientos para mostrar')}
    />
  );
};

export default LazyEntryList;
