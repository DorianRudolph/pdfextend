import AttachFileIcon from '@mui/icons-material/AttachFile';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  AppBar,
  Box,
  Button,
  capitalize,
  Checkbox,
  Container,
  CssBaseline,
  FormControlLabel,
  Grid,
  InputAdornment,
  InputBaseComponentProps,
  Link,
  MenuItem,
  TextField,
  Toolbar,
  Typography
} from '@mui/material';
import { amber, teal } from '@mui/material/colors';
import { createTheme, styled, ThemeProvider } from '@mui/material/styles';
import { matchIsValidColor, MuiColorInput } from 'mui-color-input';
import React, { Fragment } from 'react';
import { Controller, FormProvider, SubmitHandler, useForm, useFormContext } from 'react-hook-form';

const theme = createTheme({
  palette: {
    primary: teal,
    secondary: amber
  }
});

const UNITS = ['mm', 'cm', 'in', 'pt'];
const GRIDS = ['none', 'squares', 'lines', 'dots'];

class PdfExtendParams {
  leftMargin: string = '';
  rightMargin: string = '';
  topMargin: string = '';
  bottomMargin: string = '';
  spacing: string = '5';
  lineWidth: string = '0.3';
  grid: string = GRIDS[0];
  unit: string = UNITS[0];
  mirror: boolean = false;
  extraPage: boolean = false;
  color: string = '#f0f0f0';
  file: File | null = null;
}
const DEFAULT_PARAMS = new PdfExtendParams();

type INumberInputProps = {
  name: string;
  label: string;
  min: number;
  [rest: string]: any;
};

function saveParams(params: PdfExtendParams) {
  localStorage.setItem('params', JSON.stringify({ ...params, file: null }));
}

function loadParams(): PdfExtendParams {
  let str = localStorage.getItem('params');
  let parsed = str ? JSON.parse(str) : {};
  return { ...DEFAULT_PARAMS, ...parsed };
}

const initialParams = loadParams();

const NumberInput: React.FC<INumberInputProps> = ({ name, label, min }) => {
  const { watch, control } = useFormContext();
  const max = 1e6;

  return (
    <Controller
      control={control}
      name={name}
      rules={{
        pattern: {
          value: /^-?[0-9]+\.?[0-9]*$/,
          message: 'invalid number'
        },
        validate: (v) => {
          const x = parseFloat(v);
          if (v === '') return true;
          if (isNaN(x)) return 'invalid number';
          if (x < min) return `< ${min}`;
          if (x > max) return `> ${max}`;
          return true;
        }
      }}
      render={({ field, fieldState }) => (
        <TextField
          label={label}
          {...field}
          error={!!fieldState.error}
          helperText={fieldState.error?.message || ''}
          InputProps={{
            endAdornment: <InputAdornment position="end">{watch('unit')}</InputAdornment>
          }}
          inputProps={{ inputMode: 'numeric' }}
        />
      )}
    />
  );
};

export default function App() {
  const methods = useForm<PdfExtendParams>({
    mode: 'onBlur',
    defaultValues: initialParams
  });

  const {
    reset,
    handleSubmit,
    register,
    control,
    watch,
    formState: { isSubmitSuccessful, errors }
  } = methods;

  const onSubmitHandler: SubmitHandler<PdfExtendParams> = (values) => {
    console.log('submit', values);
    saveParams(values);
  };

  const params = watch();
  let cmdArgs: String[] = ['pdfextend', 'in.pdf', 'out.pdf'];
  if (params.leftMargin) cmdArgs.push(`--left=${params.leftMargin}`);
  if (params.rightMargin) cmdArgs.push(`--right=${params.rightMargin}`);
  if (params.topMargin) cmdArgs.push(`--top=${params.topMargin}`);
  if (params.bottomMargin) cmdArgs.push(`--bottom=${params.bottomMargin}`);
  cmdArgs.push(`--spacing=${params.spacing}`);
  cmdArgs.push(`--line-width=${params.lineWidth}`);
  cmdArgs.push(`--unit=${params.unit}`);
  cmdArgs.push(`--grid=${params.grid}`);
  if (params.extraPage) cmdArgs.push(`--extra-page`);
  if (params.mirror) cmdArgs.push(`--mirror`);
  cmdArgs.push(`--color=${params.color}`);
  const command = cmdArgs.join(' ');

  const disable = Object.keys(errors).length > 0 || params.file === null;
  const lineName = watch('grid') == 'dots' ? 'Dot' : 'Line';

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="relative">
        <Toolbar>
          <NoteAddIcon sx={{ mr: 2 }} />
          <Typography variant="h6" color="inherit" noWrap>
            PDFextend
          </Typography>
        </Toolbar>
      </AppBar>

      <Container sx={{ py: 4 }} maxWidth="md" component="main">
        <Typography variant="subtitle1">
          Add margins with grid lines for annotation to any PDF document.
        </Typography>
        <FormProvider {...methods}>
          <Box
            component="form"
            sx={{ mt: 3 }}
            noValidate
            autoComplete="off"
            onSubmit={handleSubmit(onSubmitHandler)}
          >
            {/* <FormHelperText sx={{ mb: 1 }}>Margins</FormHelperText> */}
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <NumberInput name="leftMargin" label="Left" min={0} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <NumberInput name="rightMargin" label="Right" min={0} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <NumberInput name="topMargin" label="Top" min={0} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <NumberInput name="bottomMargin" label="Bottom" min={0} />
              </Grid>

              <Grid item xs={6} sm={3}>
                <NumberInput name="spacing" label="Spacing" min={1} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <NumberInput name="lineWidth" label={`${lineName} width`} min={0} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <Controller
                  render={({ field }) => (
                    <TextField {...field} fullWidth label="Grid" select>
                      {GRIDS.map((grid) => (
                        <MenuItem value={grid} key={grid}>
                          {capitalize(grid)}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                  name="grid"
                  control={control}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <Controller
                  render={({ field }) => (
                    <TextField {...field} fullWidth label="Unit" select>
                      {UNITS.map((unit) => (
                        <MenuItem value={unit} key={unit}>
                          {unit}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                  name="unit"
                  control={control}
                />
              </Grid>

              <Grid item xs={6}>
                <Controller
                  name="color"
                  control={control}
                  rules={{ validate: matchIsValidColor }}
                  render={({ field, fieldState }) => (
                    <MuiColorInput
                      {...field}
                      format="hex"
                      inputProps={{ style: { fontFamily: 'monospace' } }}
                      isAlphaHidden={true}
                      label={`${lineName} color`}
                      fullWidth
                      helperText={fieldState.error ? 'invalid color' : ''}
                      error={!!fieldState.error}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={6}>
                <Controller
                  name="file"
                  control={control}
                  rules={{
                    validate: (v) => {
                      if (v && !v.name.toLowerCase().endsWith('.pdf')) return 'not a PDF';
                      return true;
                    }
                  }}
                  render={({ field, fieldState }) => {
                    return (
                      <TextField
                        fullWidth
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          field.onChange(e.target.files?.[0] || null)
                        }
                        label="PDF file"
                        type="file"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <AttachFileIcon />
                            </InputAdornment>
                          ),
                          inputComponent: FileInput
                        }}
                        inputProps={{
                          accept: 'application/pdf',
                          text: field.value?.name || ''
                        }}
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message || ''}
                      />
                    );
                  }}
                />
              </Grid>

              <Grid item xs={6}>
                <Controller
                  name="mirror"
                  control={control}
                  render={({ field }) => {
                    return (
                      <FormControlLabel
                        label="Mirror margins on even pages"
                        control={
                          <Checkbox
                            {...field}
                            // workaround from https://stackoverflow.com/questions/68013420/material-ui-checkbox-is-not-working-in-react-hook-form
                            checked={field.value}
                            onChange={(e) => field.onChange(e.target.checked)}
                          />
                        }
                      />
                    );
                  }}
                />
              </Grid>
              <Grid item xs={6}>
                <Controller
                  name="extraPage"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      label={`Append ${params.grid == 'none' ? 'blank' : 'grid'} page`}
                      control={
                        <Checkbox
                          {...field}
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                      }
                    />
                  )}
                />
              </Grid>
            </Grid>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={disable}
            >
              Extend!
            </Button>
            <Grid container justifyContent="flex-end">
              <Grid item>
                <Link href="#" variant="body2">
                  Already have an account? Sign in
                </Link>
              </Grid>
            </Grid>
          </Box>
        </FormProvider>

        <Box sx={{ mt: 2 }}>
          <Accordion>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="panel1a-content"
              id="panel1a-header"
            >
              <Typography>Command line arguments</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {/* Don't break arguments when wrapping */}
              <code>
                {cmdArgs.map((arg, i) => (
                  <Fragment>
                    <span style={{ whiteSpace: 'nowrap' }}>{arg}</span>
                    {i < cmdArgs.length - 1 && ' '}
                  </Fragment>
                ))}
              </code>
            </AccordionDetails>
          </Accordion>
        </Box>
      </Container>

      <Box sx={{ bgcolor: 'background.paper', p: 6 }} component="footer">
        <Typography variant="h6" align="center" gutterBottom>
          Footer
        </Typography>
        <Typography variant="subtitle1" align="center" color="text.secondary" component="p">
          Something here to give the footer a purpose!
        </Typography>
        <Copyright />
      </Box>
      {/* End footer */}
    </ThemeProvider>
  );
}

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

const FileInput = React.forwardRef(
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

function Copyright() {
  return (
    <Typography variant="body2" color="text.secondary" align="center">
      {'Copyright © '}
      <Link color="inherit" href="https://dorianrudolph.com/">
        Dorian Rudolph
      </Link>{' '}
      {new Date().getFullYear()}
      {'.'}
    </Typography>
  );
}
