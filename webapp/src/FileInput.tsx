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
/*
  Since this may be of independent interest, this component is also licensed under the MIT license:

  The MIT License (MIT)

  Copyright (c) 2023  Dorian Rudolph

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.
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
