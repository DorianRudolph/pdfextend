import React from 'react';
import prettyBytes from 'pretty-bytes';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { InputBaseComponentProps } from '@mui/material/InputBase';
import type { TextFieldProps as MuiTextFieldProps } from '@mui/material/TextField';
import { styled } from '@mui/material/styles';

type TextFieldProps = Omit<
  MuiTextFieldProps,
  'onChange' | 'select' | 'type' | 'multiline' | 'defaultValue'
>;

export function generateUuid(): string {
  return `_${Math.random().toString(36).substr(2, 9)}`;
}

export function truncateText(text: string, maxLength: number): string {
  const textLength = text.length;

  if (textLength < maxLength) {
    return text;
  }

  const charsKeepOneSide = Math.floor((maxLength - 1) / 2);

  return `${text.slice(0, charsKeepOneSide)}…${text.slice(text.length - charsKeepOneSide)}`;
}

export function matchIsNonEmptyArray<T>(array: T[]): array is [T, ...T[]] {
  return array.length > 0;
}

export function getTotalFilesSize(files: File[]): number {
  return files.reduce((previousValue, currentFile) => {
    return previousValue + currentFile.size;
  }, 0);
}

export function matchIsFile(value: unknown): value is File {
  return value instanceof File;
}

export function fileListToArray(filelist: FileList): File[] {
  return Array.from(filelist);
}

export type MuiFileInputProps<T extends boolean = false> = {
  value?: T extends true ? File[] : File | null;
  hideSizeText?: boolean;
  multiple?: T;
  getInputText?: (files: T extends true ? File[] : File | null) => string;
  getSizeText?: (files: T extends true ? File[] : File | null) => string;
  onChange?: (value: T extends true ? File[] : File | null) => void;
} & TextFieldProps;

type NonUndefined<T> = T extends undefined ? never : T;

type InputProps = InputBaseComponentProps & {
  text: string;
  isPlaceholder: boolean;
};

const StyledLabel = styled('label')`
  position: relative;

  input {
    opacity: 0 !important;
  }

  span {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    z-index: 2;
    display: flex;
    align-items: center;
  }

  span.MuiFileInput-placeholder {
    color: gray;
  }
`;

const Input = React.forwardRef((props: InputProps, ref: React.ForwardedRef<HTMLInputElement>) => {
  const { text, isPlaceholder, placeholder, ...restInputProps } = props;
  // eslint-disable-next-line react/hook-use-state
  const [id] = React.useState<string>(() => {
    return generateUuid();
  });

  return (
    <StyledLabel htmlFor={id}>
      <input {...restInputProps} ref={ref} id={id} />
      {text ? (
        <span
          aria-placeholder={placeholder}
          className={isPlaceholder ? 'MuiFileInput-placeholder' : ''}
        >
          {text}
        </span>
      ) : null}
    </StyledLabel>
  );
});

// eslint-disable-next-line react/function-component-definition
function MuiFileInput<T extends boolean = false>(props: MuiFileInputProps<T>) {
  const {
    value,
    onChange,
    disabled,
    getInputText,
    getSizeText,
    placeholder,
    hideSizeText,
    inputProps,
    InputProps,
    multiple,
    className,
    ...restTextFieldProps
  } = props;
  const inputRef = React.useRef<HTMLInputElement>(null);
  const isMultiple =
    multiple ||
    (inputProps?.multiple as boolean) ||
    (InputProps?.inputProps?.multiple as boolean) ||
    false;

  const clearInputValue = () => {
    const inputEl = inputRef.current;
    if (inputEl) {
      inputEl.value = '';
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    const files = fileList ? fileListToArray(fileList) : [];
    clearInputValue();
    if (isMultiple) {
      onChange?.(files as NonNullable<typeof value>);
    } else {
      onChange?.(files[0] as unknown as NonNullable<typeof value>);
    }
  };

  const handleClearAll = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (disabled) {
      return;
    }

    if (multiple) {
      onChange?.([] as unknown as NonNullable<typeof value>);
    } else {
      onChange?.(null as NonUndefined<typeof value>);
    }
  };

  const hasAtLeastOneFile = Array.isArray(value) ? matchIsNonEmptyArray(value) : matchIsFile(value);

  const getTheInputText = (): string => {
    if (value === null || (Array.isArray(value) && value.length === 0)) {
      return placeholder || '';
    }
    if (typeof getInputText === 'function' && value !== undefined) {
      return getInputText(value);
    }
    if (value && hasAtLeastOneFile) {
      if (Array.isArray(value) && value.length > 1) {
        return `${value.length} files`;
      }
      const filename = matchIsFile(value) ? value.name : value[0]?.name || '';
      return truncateText(filename, 20);
    }
    return '';
  };

  const getTotalSizeText = (): string => {
    if (typeof getSizeText === 'function' && value !== undefined) {
      return getSizeText(value);
    }
    if (hasAtLeastOneFile) {
      if (Array.isArray(value)) {
        const totalSize = getTotalFilesSize(value);
        return prettyBytes(totalSize);
      }
      if (matchIsFile(value)) {
        return prettyBytes(value.size);
      }
    }
    return '';
  };

  return (
    <TextField
      type="file"
      disabled={disabled}
      onChange={handleChange}
      className={`MuiFileInput-TextField ${className || ''}`}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <AttachFileIcon />
          </InputAdornment>
        ),
        endAdornment: (
          <InputAdornment
            position="end"
            style={{ visibility: hasAtLeastOneFile ? 'visible' : 'hidden' }}
          >
            {!hideSizeText ? (
              <Typography variant="caption" mr="2px" className="MuiFileInput-Typography-size-text">
                {getTotalSizeText()}
              </Typography>
            ) : null}
            <IconButton
              aria-label="Clear"
              title="Clear"
              size="small"
              disabled={disabled}
              className="MuiFileInput-IconButton"
              onClick={handleClearAll}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </InputAdornment>
        ),
        ...InputProps,
        inputProps: {
          text: getTheInputText(),
          multiple: isMultiple,
          isPlaceholder: value === null || (Array.isArray(value) && value.length === 0),
          ref: inputRef,
          placeholder,
          ...inputProps,
          ...InputProps?.inputProps
        },
        // @ts-ignore
        inputComponent: Input
      }}
      {...restTextFieldProps}
    />
  );
}

export { MuiFileInput };
