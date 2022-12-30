import { NoteAdd } from '@mui/icons-material';
import {
  AppBar,
  Box,
  Button,
  Container,
  CssBaseline,
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
  leftMargin: number = 0;
  rightMargin: number = 0;
  topMargin: number = 0;
  bottomMargin: number = 0;
  spacing: number = 5;
  lineWidth: number = 0.3;
  grid: string = GRIDS[0];
  unit: string = UNITS[0];
  mirror: boolean = false;
  extraPage: boolean = false;
  file: File | null = null;
}

type INumberInputProps = {
  name: string;
  label: string;
  [rest: string]: any;
};

const NumberInput: React.FC<INumberInputProps> = ({ name, label }) => {
  const {
    watch,
    control,
    formState: { errors }
  } = useFormContext();

  return (
    <Controller
      control={control}
      name={name}
      defaultValue=""
      render={({ field }) => (
        <TextField
          label={label}
          {...field}
          error={!!errors[name]}
          helperText={(errors?.[name]?.message as string) || ''}
          InputProps={{
            endAdornment: <InputAdornment position="end">{watch('unit')}</InputAdornment>
          }}
        />
      )}
    />
  );
};

export default function PdfExtend() {
  const methods = useForm<PdfExtendParams>({
    defaultValues: new PdfExtendParams()
  });

  const {
    reset,
    handleSubmit,
    register,
    control,
    formState: { isSubmitSuccessful, errors }
  } = methods;

  const onSubmitHandler: SubmitHandler<PdfExtendParams> = (values) => {
    console.log('submit', values);
  };
  // console.log(errors);

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
                <NumberInput name="leftMargin" label="Left" />
              </Grid>
              <Grid item xs={6} sm={3}>
                <NumberInput name="rightMargin" label="Right" />
              </Grid>
              <Grid item xs={6} sm={3}>
                <NumberInput name="topMargin" label="Top" />
              </Grid>
              <Grid item xs={6} sm={3}>
                <NumberInput name="bottomMargin" label="Bottom" />
              </Grid>
              <Grid item xs={6} sm={3}>
                <Controller
                  render={({ field }) => (
                    <TextField {...field} fullWidth label="Grid" select>
                      {GRIDS.map((grid) => (
                        <MenuItem value={grid} key={grid}>
                          {grid}
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
            </Grid>
            <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>
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
