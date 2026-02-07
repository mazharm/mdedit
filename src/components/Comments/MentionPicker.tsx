import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  makeStyles,
  tokens,
  Textarea,
  Text,
  Avatar,
  Spinner,
} from '@fluentui/react-components';
import { searchUsers, Person } from '../../services/peopleService';
import { searchLocalAuthors } from '../../services/localPeopleService';
import type { GetTokenFn } from '../../services/graphService';

const useStyles = makeStyles({
  container: {
    position: 'relative',
    width: '100%',
  },
  textarea: {
    width: '100%',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    maxHeight: '200px',
    overflow: 'auto',
    minWidth: '200px',
    zIndex: 1000,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    boxShadow: tokens.shadow16,
  },
  option: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  optionSelected: {
    backgroundColor: tokens.colorNeutralBackground1Selected,
  },
  optionInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  loading: {
    padding: '12px',
    display: 'flex',
    justifyContent: 'center',
  },
  noResults: {
    padding: '12px',
    textAlign: 'center',
    color: tokens.colorNeutralForeground3,
  },
});

interface MentionPickerProps {
  value: string;
  onChange: (value: string) => void;
  onMentionSelect: (person: Person) => void;
  getToken: GetTokenFn;
  isAuthenticated: boolean;
  placeholder?: string;
  canUsePeopleSearch?: boolean;
  localAuthors?: Person[];
}

export function MentionPicker({
  value,
  onChange,
  onMentionSelect,
  getToken,
  isAuthenticated,
  placeholder = 'Type @ to mention someone...',
  canUsePeopleSearch = true,
  localAuthors,
}: MentionPickerProps) {
  const styles = useStyles();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionStartPos, setMentionStartPos] = useState<number | null>(null);

  // Search for users when query changes
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults([]);
      return;
    }

    // Use Graph People API when available, otherwise fall back to local authors
    if (isAuthenticated && canUsePeopleSearch) {
      const searchTimeout = setTimeout(async () => {
        setIsLoading(true);
        try {
          const users = await searchUsers(getToken, searchQuery);
          setResults(users);
          setSelectedIndex(0);
        } catch (error) {
          console.error('Failed to search users:', error);
          setResults([]);
        } finally {
          setIsLoading(false);
        }
      }, 300);

      return () => clearTimeout(searchTimeout);
    } else if (localAuthors && localAuthors.length > 0) {
      // Local author search (synchronous, no debounce needed)
      const matched = searchLocalAuthors(localAuthors, searchQuery);
      setResults(matched);
      setSelectedIndex(0);
    } else {
      setResults([]);
    }
  }, [searchQuery, getToken, isAuthenticated, canUsePeopleSearch, localAuthors]);

  const handleChange = useCallback(
    (_e: React.ChangeEvent<HTMLTextAreaElement>, data: { value: string }) => {
      const newValue = data.value;

      onChange(newValue);

      // Get cursor position from the native element
      const cursorPos = _e.target.selectionStart ?? newValue.length;

      // Check if we're typing a mention
      const textBeforeCursor = newValue.substring(0, cursorPos);
      const lastAtIndex = textBeforeCursor.lastIndexOf('@');

      if (lastAtIndex !== -1) {
        // Check if there's no space between @ and cursor
        const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
        if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
          setMentionStartPos(lastAtIndex);
          setSearchQuery(textAfterAt);
          setIsOpen(true);
          return;
        }
      }

      setIsOpen(false);
      setSearchQuery('');
      setMentionStartPos(null);
    },
    [onChange]
  );

  const handleSelect = useCallback(
    (person: Person) => {
      if (mentionStartPos === null) return;

      // Replace the @query with @Name
      const before = value.substring(0, mentionStartPos);
      const after = value.substring(mentionStartPos + searchQuery.length + 1);
      const newValue = `${before}@${person.name} ${after}`;

      onChange(newValue);
      onMentionSelect(person);

      setIsOpen(false);
      setSearchQuery('');
      setMentionStartPos(null);

      // Focus back on textarea
      textareaRef.current?.focus();
    },
    [value, mentionStartPos, searchQuery, onChange, onMentionSelect]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || results.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % results.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
          break;
        case 'Enter':
          e.preventDefault();
          handleSelect(results[selectedIndex]);
          break;
        case 'Escape':
          setIsOpen(false);
          break;
      }
    },
    [isOpen, results, selectedIndex, handleSelect]
  );

  return (
    <div className={styles.container}>
      <Textarea
        ref={textareaRef}
        className={styles.textarea}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        resize="vertical"
      />
      {isOpen && (isAuthenticated || (localAuthors && localAuthors.length > 0)) && (
        <div className={styles.dropdown}>
          {isLoading ? (
            <div className={styles.loading}>
              <Spinner size="tiny" />
            </div>
          ) : results.length === 0 ? (
            <div className={styles.noResults}>
              <Text size={200}>No users found</Text>
            </div>
          ) : (
            results.map((person, index) => (
              <div
                key={person.id}
                className={`${styles.option} ${
                  index === selectedIndex ? styles.optionSelected : ''
                }`}
                onClick={() => handleSelect(person)}
              >
                <Avatar name={person.name} size={24} />
                <div className={styles.optionInfo}>
                  <Text weight="semibold" size={200}>
                    {person.name}
                  </Text>
                  <Text size={100}>{person.email}</Text>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
