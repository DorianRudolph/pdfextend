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
import GitHubIcon from '@mui/icons-material/GitHub';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import {
  Alert,
  AppBar,
  Box,
  Button,
  capitalize,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Checkbox,
  CircularProgress,
  Container,
  CssBaseline,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  Link,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Toolbar,
  Typography
} from '@mui/material';
import { orange, teal } from '@mui/material/colors';
import { createTheme, styled, ThemeProvider } from '@mui/material/styles';
import { matchIsValidColor, MuiColorInput } from 'mui-color-input';
import React, { Fragment, Suspense, useEffect, useRef, useState } from 'react';
import { Controller, FormProvider, SubmitHandler, useForm, useFormContext } from 'react-hook-form';
import { FileInput } from './FileInput';
import { Accordion, AccordionDetails, AccordionSummary } from './GrayAccordion';
import CloseIcon from '@mui/icons-material/Close';
import zIndex from '@mui/material/styles/zIndex';

function makeLazy(factory: any) {
  const Lazy = React.lazy(factory);
  return () => (
    <Suspense fallback={<CircularProgress />}>
      <Lazy />
    </Suspense>
  );
}

const PolicyComponent = makeLazy(() => import('./policy.md'));
const LicenseComponent = makeLazy(() => import('./license.md'));

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

let allowLocalStorage = localStorage.getItem('allow') === 'true';

function setAllowLocalStorage() {
  localStorage.setItem('allow', 'true');
  allowLocalStorage = true;
}

function saveParams(params: PdfExtendParams) {
  if (allowLocalStorage) localStorage.setItem('params', JSON.stringify({ ...params, file: null }));
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
    watch,
    formState: { errors }
  } = methods;

  const params = watch();
  const cmdArgs = getArgs(params);
  const [waiting, setWaiting] = React.useState(false);
  const disableExtendButton = Object.keys(errors).length > 0 || params.file === null || waiting;

  const [workerResponse, setWorkerResponse] = React.useState<WorkerResponse | null>(null);
  const worker = useRef<Worker | null>(null);
  useEffect(() => () => worker.current?.terminate(), []);

  const onSubmitHandler: SubmitHandler<PdfExtendParams> = (values) => {
    console.log('submit', values);
    setWaiting(true);
    saveParams(values);
    const command = cmdArgs.join(' ');
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
          // console.log('worker message', msg);
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
              <FormControls />
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

function FormControls() {
  const { watch, control } = useFormContext();
  const grid = watch('grid');
  const lineName = grid == 'dots' ? 'Dot' : 'Line';
  return (
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
        <NumberInput name="spacing" label="Spacing" min={0.1} />
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
              label={`Append ${grid == 'none' ? 'blank' : 'grid'} page`}
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
        {/* Don't break arguments when wrapping: spans are nowrap, so line breaks only occur between spans */}
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
  const [showInfo, setShowInfo] = useState(true);
  const [showPolicy, setShowPolicy] = useState(false);
  const closePolicy = () => setShowPolicy(false);
  const [showLicense, setShowLicense] = useState(false);
  const closeLicense = () => setShowLicense(false);
  return (
    <Fragment>
      <Box
        sx={{
          bgcolor: 'background.paper',
          p: 2,
          display: 'flex',
          alignItems: 'center',
          flexDirection: 'column'
        }}
        component="footer"
      >
        <Typography variant="body2" color="text.secondary">
          {'Copyright © '}
          <Link color="inherit" href="https://www.dorianrudolph.com/">
            Dorian Rudolph
          </Link>{' '}
          {new Date().getFullYear()}
          {'.'}
        </Typography>

        <Link
          color="inherit"
          onClick={() => setShowPolicy(true)}
          component="button"
          textAlign="center"
        >
          <Typography variant="body2" color="text.secondary" pt={1}>
            Privacy Policy / Impressum / Legal Notice
          </Typography>
        </Link>

        <Box pt={1}>
          <Link
            color="inherit"
            onClick={() => setShowLicense(true)}
            component="button"
            sx={{ verticalAlign: 'baseline' }}
          >
            <Typography variant="body2" color="text.secondary" component="span">
              Open Source Licenses
            </Typography>
          </Link>{' '}
          <Link color="inherit" href="/license.pdf">
            <Typography variant="body2" color="text.secondary" component={'span'}>
              (PDF)
            </Typography>
          </Link>
        </Box>

        <Typography variant="body2" color="text.secondary" pt={1}>
          <Link color="inherit" href="https://github.com/DorianRudolph/pdfextend">
            <GitHubIcon />
          </Link>
        </Typography>
      </Box>

      <Dialog open={showPolicy} scroll="body" onClose={closePolicy}>
        <DialogTitle>PDFextend Policy</DialogTitle>
        <DialogContent dividers={true} tabIndex={-1} color="text.primary">
          <PolicyComponent />
        </DialogContent>
        <DialogActions>
          <Button onClick={closePolicy}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showLicense} scroll="body" onClose={closeLicense} maxWidth="md">
        <DialogTitle>Open source licenses</DialogTitle>
        <DialogContent dividers={true} tabIndex={-1} color="text.primary">
          <MdDiv>
            <LicenseComponent />
          </MdDiv>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeLicense}>Close</Button>
        </DialogActions>
      </Dialog>

      <InfoSnackbar showPolicy={() => setShowPolicy(true)} />
    </Fragment>
  );
}

const MdDiv = styled('div')(({ theme }) => ({
  wordWrap: 'break-word',
  fontSize: '70%',
  pre: {
    border: `1px solid ${theme.palette.divider}`,
    overflow: 'auto',
    padding: '10px'
  }
}));

const InfoSnackbar: React.FC<{ showPolicy: () => void }> = ({ showPolicy }) => {
  const [open, setOpen] = React.useState(!allowLocalStorage);

  const handleClose = (event: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }

    setOpen(false);
  };

  function handleAccept() {
    setAllowLocalStorage();
    setOpen(false);
  }

  const action = (
    <React.Fragment>
      <Button color="primary" size="small" onClick={() => showPolicy()} sx={{ px: 1 }}>
        SEE PRIVACY POLICY
      </Button>
      <Button color="secondary" size="small" onClick={handleAccept} sx={{ px: 1 }}>
        ACCEPT
      </Button>
      <IconButton size="small" aria-label="close" color="inherit" onClick={handleClose}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </React.Fragment>
  );

  return (
    <Snackbar
      open={open}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      onClose={handleClose}
      message='PDFextend uses "localStorage" to save user preferences. It is hosted by Cloudflare, which may set strictly necessary cookies for security and load balancing.'
      action={action}
      sx={{ zIndex: 1250 }}
    />
  );
};
