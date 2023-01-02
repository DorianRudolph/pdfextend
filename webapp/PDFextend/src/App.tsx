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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import GitHubIcon from '@mui/icons-material/GitHub';
import {
  AppBar,
  Box,
  Button,
  capitalize,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Checkbox,
  Container,
  CssBaseline,
  FormControlLabel,
  Grid,
  InputAdornment,
  LinearProgress,
  Link,
  MenuItem,
  TextField,
  Toolbar,
  Typography
} from '@mui/material';
import { orange, teal } from '@mui/material/colors';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { matchIsValidColor, MuiColorInput } from 'mui-color-input';
import React, { Fragment, useEffect, useRef } from 'react';
import { Controller, FormProvider, SubmitHandler, useForm, useFormContext } from 'react-hook-form';
import { FileInput } from './FileInput';
import { Accordion, AccordionDetails, AccordionSummary } from './GrayAccordion';

const theme = createTheme({
  palette: {
    primary: teal,
    secondary: orange
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

function getArgs(params: PdfExtendParams) {
  let args: String[] = ['pdfextend', 'in.pdf', 'out.pdf'];
  if (params.leftMargin) args.push(`--left=${params.leftMargin}`);
  if (params.rightMargin) args.push(`--right=${params.rightMargin}`);
  if (params.topMargin) args.push(`--top=${params.topMargin}`);
  if (params.bottomMargin) args.push(`--bottom=${params.bottomMargin}`);
  args.push(`--spacing=${params.spacing}`);
  args.push(`--line-width=${params.lineWidth}`);
  args.push(`--unit=${params.unit}`);
  if (params.grid != 'none') args.push(`--grid=${params.grid}`);
  if (params.extraPage) args.push(`--extra-page`);
  if (params.mirror) args.push(`--mirror`);
  args.push(`--color=${params.color}`);
  return args;
}

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

const condShow = (pred: any) => (pred ? {} : { display: 'none' });

const NumberInput: React.FC<INumberInputProps> = ({ name, label, min }) => {
  const { watch, control } = useFormContext();
  const max = 1e5;

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

type WorkerResponse = {
  type: string;
  file: Blob;
  fileName: string;
  preview: ImageData;
};

export default function App() {
  const methods = useForm<PdfExtendParams>({
    mode: 'onBlur',
    defaultValues: initialParams
  });

  const {
    handleSubmit,
    control,
    watch,
    formState: { errors }
  } = methods;

  const params = watch();
  const cmdArgs = getArgs(params);
  const [waiting, setWaiting] = React.useState(false);
  const disableExtendButton = Object.keys(errors).length > 0 || params.file === null || waiting;
  const lineName = params.grid == 'dots' ? 'Dot' : 'Line';

  const [workerResponse, setWorkerResponse] = React.useState<WorkerResponse | null>(null);
  const worker = useRef<Worker | null>(null);
  useEffect(() => () => worker.current?.terminate(), []);

  const onSubmitHandler: SubmitHandler<PdfExtendParams> = (values) => {
    console.log('submit', values);
    setWaiting(true);
    saveParams(values);
    const command = cmdArgs.join(' ');
    console.log(command);
    const msg = {
      type: 'extend',
      file: params.file,
      command: command
    };
    if (!worker.current) {
      worker.current = new Worker('worker.js');
      worker.current.onmessage = (e: MessageEvent<WorkerResponse>) => {
        const msg = e.data;
        if (msg.type == 'extend') {
          console.log('worker message', msg);
          setWorkerResponse(msg);
          setWaiting(false);
        }
      };
    }
    worker.current.postMessage(msg);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      {/* Ensure the footer is at the bottom even if window is taller than page content.
      Main has flexGrow:1 so that it fills the available space. */}
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <AppBar position="relative">
          <Toolbar>
            <NoteAddIcon sx={{ mr: 2 }} />
            <Typography variant="h6" color="inherit" noWrap>
              PDFextend
            </Typography>
          </Toolbar>
        </AppBar>

        <Container sx={{ py: 4, flexGrow: 1 }} maxWidth="md" component="main">
          <Typography variant="subtitle1">
            Add margins with grid lines for annotation to a PDF document.
          </Typography>
          <FormProvider {...methods}>
            <Box
              component="form"
              sx={{ mt: 3 }}
              noValidate
              autoComplete="off"
              onSubmit={handleSubmit(onSubmitHandler)}
            >
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
                        <FileInput
                          {...field}
                          fullWidth
                          label="PDF file"
                          accept="application/pdf"
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
                              // see https://stackoverflow.com/questions/68013420/material-ui-checkbox-is-not-working-in-react-hook-form
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

              <Grid container justifyContent="center" spacing={2}>
                <Grid item xs={6} md={3}>
                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    sx={{ mt: 2, mb: 2 }}
                    disabled={disableExtendButton}
                  >
                    Extend!
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </FormProvider>

          <Preview waiting={waiting} workerResponse={workerResponse} />

          <CommandLineArgs args={cmdArgs} />
        </Container>

        <Footer />
      </Box>
    </ThemeProvider>
  );
}

const Preview: React.FC<{ waiting: boolean; workerResponse: WorkerResponse | null }> = ({
  waiting,
  workerResponse
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const preview = workerResponse?.preview;
    if (canvas && preview) {
      canvas.width = preview.width;
      canvas.height = preview.height;
      canvas.getContext('2d')?.putImageData(preview, 0, 0);
    }
  }, [workerResponse]);
  return (
    <Fragment>
      <Box sx={{ width: '100%', mt: 2, mb: 4, ...condShow(waiting) }}>
        <LinearProgress color="secondary" />
      </Box>
      <Card
        sx={{
          width: '100%',
          mt: 4,
          mb: 6,
          backgroundColor: 'rgba(0, 0, 0, .03)',
          ...condShow(workerResponse)
        }}
        elevation={5}
      >
        <CardActionArea
          href={workerResponse ? URL.createObjectURL(workerResponse.file) : ''}
          download={workerResponse?.fileName || ''}
        >
          <CardContent>
            <Typography variant="body2" style={{ wordWrap: 'break-word' }}>
              Download: {workerResponse?.fileName}
            </Typography>
          </CardContent>
          <CardMedia component="canvas" ref={canvasRef} style={{ width: '100%', height: 'auto' }} />
        </CardActionArea>
      </Card>
    </Fragment>
  );
};

const CommandLineArgs: React.FC<{ args: String[] }> = ({ args }) => (
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
          {args.map((arg, i) => (
            <Fragment key={i}>
              <span style={{ whiteSpace: 'nowrap' }}>{arg}</span>
              {i < args.length - 1 && ' '}
            </Fragment>
          ))}
        </code>
      </AccordionDetails>
    </Accordion>
  </Box>
);

function Footer() {
  return (
    <Box sx={{ bgcolor: 'background.paper', p: 6 }} component="footer">
      <Typography variant="body2" color="text.secondary" align="center">
        {'Copyright © '}
        <Link color="inherit" href="https://www.dorianrudolph.com/">
          Dorian Rudolph
        </Link>{' '}
        {new Date().getFullYear()}
        {'.'}
      </Typography>

      <Typography variant="body2" color="text.secondary" pt={1} align="center">
        <Link color="inherit" href="https://dorianrudolph.com/">
          Privacy Policy / Impressum / Legal Notice
        </Link>
      </Typography>

      <Typography variant="body2" color="text.secondary" pt={1} align="center">
        <Link color="inherit" href="https://dorianrudolph.com/">
          Open Source Licenses
        </Link>
      </Typography>

      <Typography variant="body2" color="text.secondary" pt={1} align="center">
        <Link color="inherit" href="https://github.com/DorianRudolph/pdfextend">
          <GitHubIcon />
        </Link>
      </Typography>
    </Box>
  );
}
