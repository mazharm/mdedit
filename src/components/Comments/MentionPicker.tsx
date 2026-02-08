import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  makeStyles,
  tokens,
  Textarea,
  Text,
  Avatar,
  Portal,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Input,
  Button,
  Label,
} from '@fluentui/react-components';
import { Search24Regular, Dismiss24Regular } from '@fluentui/react-icons';
import { people } from '@microsoft/teams-js';
import { searchLocalAuthors } from '../../services/localPeopleService';
import type { Person } from '../../services/peopleService';
import type { GetTokenFn } from '../../services/graphService';

// Session-level MRU cache — captures people picked via search
// before they are persisted in document comments on save.
const MAX_RECENT = 20;
let recentPeople: Person[] = [];

export function addRecentPerson(person: Person) {
  recentPeople = [person, ...recentPeople.filter((p) => p.id !== person.id)].slice(0, MAX_RECENT);
}

export function getRecentPeople(): Person[] {
  return recentPeople;
}

function dedup(list: Person[]): Person[] {
  const seen = new Set<string>();
  return list.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

const useStyles = makeStyles({
  container: {
    position: 'relative',
    width: '100%',
  },
  textarea: {
    width: '100%',
  },
  dropdown: {
    position: 'fixed',
    maxHeight: '200px',
    overflowY: 'auto',
    minWidth: '200px',
    zIndex: 10000,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    boxShadow: tokens.shadow16,
    padding: '4px 0',
  },
  option: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
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
    minWidth: 0,
  },
  separator: {
    height: '1px',
    backgroundColor: tokens.colorNeutralStroke2,
    margin: '4px 0',
  },
  searchOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    cursor: 'pointer',
    color: tokens.colorBrandForeground1,
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  dialogField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginBottom: '12px',
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
  isInTeams?: boolean;
  inputRef?: React.Ref<HTMLTextAreaElement>;
}

export function MentionPicker({
  value,
  onChange,
  onMentionSelect,
  placeholder = 'Type @ to mention someone...',
  localAuthors,
  isInTeams = false,
  inputRef,
}: MentionPickerProps) {
  const styles = useStyles();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Merge internal ref with external inputRef
  const setTextareaRef = useCallback((el: HTMLTextAreaElement | null) => {
    textareaRef.current = el;
    if (!inputRef) return;
    if (typeof inputRef === 'function') {
      inputRef(el);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (inputRef as any).current = el;
    }
  }, [inputRef]);

  const [mentionActive, setMentionActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<Person[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionStartPos, setMentionStartPos] = useState<number | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);

  // Fallback dialog state (used when Teams picker is not available)
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [dialogName, setDialogName] = useState('');
  const [dialogEmail, setDialogEmail] = useState('');
  const dialogMentionCtx = useRef<{ startPos: number; query: string } | null>(null);

  const hasLocalAuthors = !!(localAuthors && localAuthors.length > 0);

  // Check if Teams people picker is available
  let teamsPeoplePickerAvailable = false;
  try {
    teamsPeoplePickerAvailable = isInTeams && people.isSupported();
  } catch {
    // Teams SDK not initialized
  }

  // Update dropdown position based on container's viewport rect
  const updateDropdownPos = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setDropdownPos({ top: rect.bottom + 2, left: rect.left, width: rect.width });
  }, []);

  // Ad-hoc person from typed query — fallback when no known match
  const adHocPerson: Person | null = searchQuery.length >= 1
    ? { id: `adhoc-${searchQuery}`, name: searchQuery, email: '' }
    : null;

  // Search known users: document people (localAuthors) + session MRU
  useEffect(() => {
    if (!mentionActive) {
      setResults([]);
      return;
    }

    const q = searchQuery.toLowerCase();

    const mruHits = q.length > 0
      ? recentPeople.filter((p) =>
          p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
        )
      : [...recentPeople];

    const docPeople = hasLocalAuthors
      ? (q.length > 0 ? searchLocalAuthors(localAuthors!, q) : localAuthors!)
      : [];

    setResults(dedup([...mruHits, ...docPeople]));
    setSelectedIndex(0);
  }, [searchQuery, mentionActive, hasLocalAuthors, localAuthors]);

  // Show ad-hoc when typing and no exact match in results
  const adHocVisible = mentionActive && searchQuery.length >= 1 && adHocPerson !== null
    && !results.some((r) => r.name.toLowerCase() === searchQuery.toLowerCase());

  // Full selectable list: known results, then ad-hoc
  const selectableItems: Person[] = adHocVisible && adHocPerson
    ? [...results, adHocPerson]
    : results;

  // Total navigable items: person options + "Search people..."
  const totalItems = selectableItems.length + 1;
  const searchOptionIndex = selectableItems.length;

  const showDropdown = mentionActive && totalItems > 0;

  useEffect(() => {
    if (showDropdown) updateDropdownPos();
  }, [showDropdown, updateDropdownPos]);

  useEffect(() => {
    if (!showDropdown) return;
    const onScrollOrResize = () => updateDropdownPos();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [showDropdown, updateDropdownPos]);

  // Insert a person as a mention (shared by Teams picker and fallback dialog)
  const insertMention = useCallback(
    (person: Person, startPos: number, query: string) => {
      const before = value.substring(0, startPos);
      const after = value.substring(startPos + query.length + 1);
      const newValue = `${before}@${person.name} ${after}`;

      onChange(newValue);
      onMentionSelect(person);
      addRecentPerson(person);

      setMentionActive(false);
      setSearchQuery('');
      setMentionStartPos(null);
    },
    [value, onChange, onMentionSelect]
  );

  // Open Teams native people picker for directory search
  const openTeamsPeoplePicker = useCallback(
    async () => {
      if (!people.isSupported() || mentionStartPos === null) return;

      const savedStartPos = mentionStartPos;
      const savedQuery = searchQuery;
      setMentionActive(false);

      try {
        const selected = await people.selectPeople({ singleSelect: true, title: 'Search people' });
        if (selected && selected.length > 0) {
          const p = selected[0];
          const person: Person = {
            id: p.objectId,
            name: p.displayName || 'Unknown',
            email: p.email || '',
          };
          insertMention(person, savedStartPos, savedQuery);
        }
      } catch (err) {
        console.error('Teams people picker failed:', err);
      }

      textareaRef.current?.focus();
    },
    [mentionStartPos, searchQuery, insertMention]
  );

  // Open fallback dialog (non-Teams: keyboard-friendly name/email input)
  const openFallbackDialog = useCallback(() => {
    dialogMentionCtx.current = mentionStartPos !== null
      ? { startPos: mentionStartPos, query: searchQuery }
      : null;
    setDialogName(searchQuery);
    setDialogEmail('');
    setMentionActive(false);
    setSearchDialogOpen(true);
  }, [mentionStartPos, searchQuery]);

  const handleDialogConfirm = useCallback(() => {
    const name = dialogName.trim();
    if (!name || !dialogMentionCtx.current) {
      setSearchDialogOpen(false);
      textareaRef.current?.focus();
      return;
    }

    const person: Person = {
      id: `person-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
      name,
      email: dialogEmail.trim(),
    };

    const { startPos, query } = dialogMentionCtx.current;
    insertMention(person, startPos, query);

    setSearchDialogOpen(false);
    dialogMentionCtx.current = null;
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, [dialogName, dialogEmail, insertMention]);

  const handleDialogCancel = useCallback(() => {
    setSearchDialogOpen(false);
    dialogMentionCtx.current = null;
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, []);

  // "Search people..." action: Teams picker if available, else fallback dialog
  const openSearchPeople = useCallback(() => {
    if (teamsPeoplePickerAvailable) {
      openTeamsPeoplePicker();
    } else {
      openFallbackDialog();
    }
  }, [teamsPeoplePickerAvailable, openTeamsPeoplePicker, openFallbackDialog]);

  const handleChange = useCallback(
    (_e: React.ChangeEvent<HTMLTextAreaElement>, data: { value: string }) => {
      const newValue = data.value;
      onChange(newValue);

      const cursorPos = _e.target.selectionStart ?? newValue.length;
      const textBeforeCursor = newValue.substring(0, cursorPos);
      const lastAtIndex = textBeforeCursor.lastIndexOf('@');

      if (lastAtIndex !== -1) {
        const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
        if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
          setMentionStartPos(lastAtIndex);
          setSearchQuery(textAfterAt);
          setMentionActive(true);
          return;
        }
      }

      setMentionActive(false);
      setSearchQuery('');
      setMentionStartPos(null);
    },
    [onChange]
  );

  const handleSelect = useCallback(
    (person: Person) => {
      if (mentionStartPos === null) return;
      insertMention(person, mentionStartPos, searchQuery);
      textareaRef.current?.focus();
    },
    [mentionStartPos, searchQuery, insertMention]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!mentionActive || totalItems === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % totalItems);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + totalItems) % totalItems);
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex === searchOptionIndex) {
            openSearchPeople();
          } else if (selectableItems[selectedIndex]) {
            handleSelect(selectableItems[selectedIndex]);
          }
          break;
        case 'Escape':
          setMentionActive(false);
          break;
      }
    },
    [mentionActive, totalItems, selectableItems, selectedIndex, searchOptionIndex, handleSelect, openSearchPeople]
  );

  return (
    <div className={styles.container} ref={containerRef}>
      <Textarea
        ref={setTextareaRef}
        className={styles.textarea}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        resize="vertical"
      />

      {showDropdown && dropdownPos && (
        <Portal>
          <div
            className={styles.dropdown}
            style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
          >
            {selectableItems.map((person, index) => (
              <div
                key={person.id}
                className={`${styles.option} ${
                  index === selectedIndex ? styles.optionSelected : ''
                }`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(person)}
              >
                <Avatar name={person.name} size={24} />
                <div className={styles.optionInfo}>
                  <Text weight="semibold" size={200}>
                    {person.id.startsWith('adhoc-') ? `@${person.name}` : person.name}
                  </Text>
                  {person.email && <Text size={100}>{person.email}</Text>}
                </div>
              </div>
            ))}
            {selectableItems.length > 0 && <div className={styles.separator} />}
            <div
              className={`${styles.searchOption} ${
                selectedIndex === searchOptionIndex ? styles.optionSelected : ''
              }`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={openSearchPeople}
            >
              <Search24Regular />
              <Text size={200} weight="semibold">Search people...</Text>
            </div>
          </div>
        </Portal>
      )}

      {/* Fallback dialog for non-Teams: keyboard-friendly name/email input */}
      <Dialog
        open={searchDialogOpen}
        onOpenChange={(_, data) => { if (!data.open) handleDialogCancel(); }}
      >
        <DialogSurface>
          <form onSubmit={(e) => { e.preventDefault(); handleDialogConfirm(); }}>
            <DialogBody>
              <DialogTitle
                action={
                  <Button
                    appearance="subtle"
                    aria-label="Close"
                    icon={<Dismiss24Regular />}
                    onClick={handleDialogCancel}
                  />
                }
              >
                Add person
              </DialogTitle>
              <DialogContent>
                <div className={styles.dialogField}>
                  <Label required htmlFor="person-name">Name</Label>
                  <Input
                    id="person-name"
                    value={dialogName}
                    onChange={(_, data) => setDialogName(data.value)}
                    placeholder="Full name"
                    autoFocus
                  />
                </div>
                <div className={styles.dialogField}>
                  <Label htmlFor="person-email">Email (optional)</Label>
                  <Input
                    id="person-email"
                    value={dialogEmail}
                    onChange={(_, data) => setDialogEmail(data.value)}
                    placeholder="email@example.com"
                  />
                </div>
              </DialogContent>
              <DialogActions>
                <Button appearance="secondary" onClick={handleDialogCancel}>Cancel</Button>
                <Button type="submit" appearance="primary" disabled={!dialogName.trim()}>Add</Button>
              </DialogActions>
            </DialogBody>
          </form>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
