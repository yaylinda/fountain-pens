import { IconButton, Tooltip } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useDirtyState } from '../context/DirtyStateContext';

interface SaveButtonProps {
    onClick: () => void;
}

export default function SaveButton({ onClick }: SaveButtonProps) {
    const { isDirty } = useDirtyState();

    return (
        <Tooltip title={isDirty ? 'Save changes to GitHub' : 'No changes to save'}>
            <span>
                <IconButton
                    color="inherit"
                    disabled={!isDirty}
                    onClick={onClick}
                    aria-label="save changes"
                >
                    <CloudUploadIcon />
                </IconButton>
            </span>
        </Tooltip>
    );
}
