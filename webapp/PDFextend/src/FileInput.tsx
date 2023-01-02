/*
  PDFextend: add margins with grid lines for annotation to a PDF document.
  Copyright (C) 2023  Dorian Rudolph

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU Affero General Public License as published
  by the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU Affero General Public License for more details.

  You should have received a copy of the GNU Affero General Public License
  along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { InputAdornment, InputBaseComponentProps, TextField, TextFieldProps } from '@mui/material';
import React from 'react';
import { styled } from '@mui/material/styles';

// super hacky way to get the FileInput to display the file name in at most two lines with ellipsis at overflow
// parent and child div are needed to get the actual text centered in the TextInput even if we set its display
const FileInputLabel = styled('label')`
  width: 100%;
  position: relative;

  .parentDiv {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    z-index: 2;
    padding-right: 14px;
  }

  .childDiv {
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    word-wrap: break-word;
  }

  input {
    opacity: 0 !important;
  }
`;

const InputComponent = React.forwardRef(
  (props: InputBaseComponentProps, ref: React.ForwardedRef<HTMLInputElement>) => {
    const { text, ...restProps } = props;
    return (
      <FileInputLabel>
        <input {...restProps} ref={ref}></input>
        <div className="parentDiv">
          <div className="childDiv">{text}</div>
        </div>
      </FileInputLabel>
    );
  }
);

type FileInputProps = {
  value?: File | null;
  onChange?: (value: File | null) => void;
  accept?: string;
} & TextFieldProps;

export const FileInput = React.forwardRef(
  (props: FileInputProps, ref: React.ForwardedRef<HTMLInputElement>) => {
    const { value, onChange, accept, ...restProps } = props;
    return (
      <TextField
        {...restProps}
        ref={ref}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          onChange?.(e.target.files?.[0] || null)
        }
        type="file"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <AttachFileIcon />
            </InputAdornment>
          ),
          inputComponent: InputComponent
        }}
        inputProps={{
          accept: accept,
          text: value?.name || ''
        }}
      />
    );
  }
);
