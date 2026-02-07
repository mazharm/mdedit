import React from 'react';
import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogContent,
  DialogActions,
  Button,
  makeStyles,
  tokens,
  Text,
} from '@fluentui/react-components';
import { Person24Regular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '16px 0',
  },
  providerButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    width: '100%',
    justifyContent: 'flex-start',
  },
  description: {
    color: tokens.colorNeutralForeground3,
    marginBottom: '8px',
  },
});

interface SignInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSignInWithMicrosoft: () => void;
  onSignInWithGoogle: () => void;
  googleEnabled: boolean;
}

export function SignInDialog({
  open,
  onOpenChange,
  onSignInWithMicrosoft,
  onSignInWithGoogle,
  googleEnabled,
}: SignInDialogProps) {
  const styles = useStyles();

  return (
    <Dialog open={open} onOpenChange={(_, data) => onOpenChange(data.open)}>
      <DialogSurface>
        <DialogTitle>Sign In</DialogTitle>
        <DialogBody>
          <DialogContent>
            <Text className={styles.description}>
              Choose a sign-in method to enable cloud features and collaboration.
            </Text>
            <div className={styles.content}>
              <Button
                className={styles.providerButton}
                appearance="primary"
                icon={<Person24Regular />}
                onClick={() => {
                  onSignInWithMicrosoft();
                  onOpenChange(false);
                }}
              >
                Sign in with Microsoft
              </Button>
              {googleEnabled && (
                <Button
                  className={styles.providerButton}
                  appearance="secondary"
                  onClick={() => {
                    onSignInWithGoogle();
                    onOpenChange(false);
                  }}
                >
                  Sign in with Google
                </Button>
              )}
            </div>
          </DialogContent>
        </DialogBody>
        <DialogActions>
          <Button appearance="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogActions>
      </DialogSurface>
    </Dialog>
  );
}
