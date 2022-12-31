import { NoteAdd } from '@mui/icons-material';
import {
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
  Link,
  MenuItem,
  TextField,
  Toolbar,
  Typography
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import * as React from 'react';
import { Controller, FormProvider, SubmitHandler, useForm, useFormContext } from 'react-hook-form';
import { matchIsValidColor, MuiColorInput } from 'mui-color-input';
import { styled } from '@mui/system';

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

const theme = createTheme();

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

// const MuiColorInputStyled = styled(MuiColorInput)`
//   & .MuiColorInput-ColorSpace {
//     touch-action: none;
//   }

//   & .MuiColorInput-HueSlider {
//     margin-top: 100px;
//   }
// `;

const MuiColorInputStyled = styled(MuiColorInput)`
  &.MuiColorInput-TextField {
    margin-top: 100px !important;
  }
  &.MuiColorInput-ColorSpace {
    margin-top: 123px !important;
  }
`;

const MyComponent = styled('div')({
  color: 'darkslategray',
  backgroundColor: 'aliceblue',
  padding: 8,
  borderRadius: 4
});

export default function PdfExtend() {
  const methods = useForm<PdfExtendParams>({
    mode: 'onBlur',
    defaultValues: DEFAULT_PARAMS
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
  };

  const disable = Object.keys(errors).length > 0;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="relative">
        <Toolbar>
          <NoteAdd sx={{ mr: 2 }} />
          <Typography variant="h6" color="inherit" noWrap>
            PDFextend
          </Typography>
        </Toolbar>
      </AppBar>

      <Container sx={{ py: 4 }} maxWidth="md" component="main">
        <Typography variant="subtitle1">
          Add margins with grid lines for annotation to any PDF document.
        </Typography>
        <MyComponent></MyComponent>
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
                <NumberInput name="lineWidth" label="Line width" min={0} />
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
                <FormControlLabel label="Mirror margins on even pages" control={<Checkbox />} />
              </Grid>
              <Grid item xs={6}>
                <FormControlLabel
                  label={`Append ${watch('grid') == 'none' ? 'blank' : 'grid'} page`}
                  control={<Checkbox />}
                />
              </Grid>
              <Grid item xs={6}>
                <Controller
                  name="color"
                  control={control}
                  rules={{ validate: matchIsValidColor }}
                  render={({ field, fieldState }) => (
                    <MuiColorInputStyled
                      {...field}
                      // format=""
                      inputProps={{ style: { fontFamily: 'monospace' } }}
                      // isAlphaHidden={true}
                      label="Line color"
                      fullWidth
                      helperText={fieldState.error ? 'Color is invalid' : ''}
                      error={!!fieldState.error}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={6}>
                {/* <ColorPicker variant="free" /> */}
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
