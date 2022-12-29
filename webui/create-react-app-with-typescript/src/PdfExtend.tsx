import { Camera, FormatPaintSharp, NoteAdd } from '@mui/icons-material';
import {
  AppBar,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Checkbox,
  Container,
  CssBaseline,
  FormControlLabel,
  Grid,
  Link,
  Stack,
  TextField,
  Toolbar,
  Typography
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import * as React from 'react';
import { FormProvider, useForm, SubmitHandler, ControllerProps } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useFormContext } from 'react-hook-form';

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

const cards = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const theme = createTheme();

const NumberButton: React.FC<{ id: string; [rest: string]: any }> = ({ id, ...rest }) => {
  return (
    <TextField
      inputProps={{ inputMode: 'numeric', pattern: '(0.|[1-9][0-9])' }}
      id={id}
      name={id}
      {...rest}
    ></TextField>
  );
};

// type NumberButtonParams {id: string, ...restProps: any}
// function NumberButtonx(props: any) {
//   const { id, ...restProps } = props;
//   console.log('REST', restProps);
//   return (
//     <TextField inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }} id={id} name={id} {*** restProps} >
//     </TextField>
//   )

// }

// function NumberButton(name: string, label: string) {
//   return (
//     <TextField inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }} name={name} reqi>
//     </TextField>
//   )
// }

interface Props {
  Comp: React.ComponentType;
}
const MyComp: React.FC<Props> = ({ Comp }) => {
  return <Comp />;
};

// https://codevoweb.com/form-validation-react-hook-form-material-ui-react/
let minMax = (min: number, max: number) => z.number().min(min, `< ${min}`).max(max, `> ${max}`);
const znum = (n: z.ZodNumber) =>
  z.preprocess((x) => (typeof x === 'string' ? parseFloat(x || '0') : x), n);
const marginType = znum(minMax(0, 1e6));
const paramsSchema = z.object({
  leftMargin: marginType,
  rightMargin: marginType,
  topMargin: marginType,
  bottomMargin: marginType,
  spacing: znum(minMax(1, 1e6)),
  lineWidth: znum(minMax(0, 1e6)),
  grid: z.enum(['none', 'squares', 'lines', 'dots']),
  unit: z.enum(['mm', 'cm', 'inches', 'points']),
  mirror: z.boolean(),
  extraPage: z.boolean(),
  file: z.instanceof(File)
});
type Params = z.TypeOf<typeof paramsSchema>;

type IFormInputProps = {
  Comp: any;
  name: string;
  [rest: string]: any;
};

const FormInput2: React.FC<IFormInputProps> = ({ Comp, name, ...rest }) => {
  const {
    control,
    formState: { errors }
  } = useFormContext();

  return (
    <Controller
      control={control}
      name={name}
      defaultValue=""
      render={({ field }) => (
        <Comp
          {...rest}
          {...field}
          error={!!errors[name]}
          helperText={(errors?.[name]?.message as string) || ''}
        />
      )}
    />
  );
};

type INumberInputProps = {
  name: string;
  label: string;
  [rest: string]: any;
};

const NumberInput: React.FC<INumberInputProps> = ({ name, label }) => {
  const {
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
        />
      )}
    />
  );
};

export default function PdfExtend() {
  const methods = useForm<Params>({
    resolver: zodResolver(paramsSchema)
  });

  const {
    reset,
    handleSubmit,
    register,
    formState: { isSubmitSuccessful, errors }
  } = methods;

  const onSubmitHandler: SubmitHandler<Params> = (values) => {
    console.log(values);
  };
  console.log(errors);

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
              {/* <Grid item xs={3}>
              <TextField
                fullWidth
                id="marginLeft"
                label="Left"
                inputProps={{ inputMode: 'numeric' }}
                {...register('marginLeft', {
                  valueAsNumber: true,
                  validate: (x) => {
                    console.log(x);
                    return true;
                  }
                })}
              />
            </Grid> */}
              {/* <Grid item xs={3}>
              <NumberButton id="marginRight" label="Right" required></NumberButton>
            </Grid> */}
            </Grid>
            <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>
              Sign Up
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

export function Album() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="relative">
        <Toolbar>
          <Camera sx={{ mr: 2 }} />
          <Typography variant="h6" color="inherit" noWrap>
            Album layout
          </Typography>
        </Toolbar>
      </AppBar>
      <main>
        {/* Hero unit */}
        <Box
          sx={{
            bgcolor: 'background.paper',
            pt: 8,
            pb: 6
          }}
        >
          <Container maxWidth="sm">
            <Typography
              component="h1"
              variant="h2"
              align="center"
              color="text.primary"
              gutterBottom
            >
              Album layout
            </Typography>
            <Typography variant="h5" align="center" color="text.secondary" paragraph>
              Something short and leading about the collection below—its contents, the creator, etc.
              Make it short and sweet, but not too short so folks don&apos;t simply skip over it
              entirely.
            </Typography>
            <Stack sx={{ pt: 4 }} direction="row" spacing={2} justifyContent="center">
              <Button variant="contained">Main call to action</Button>
              <Button variant="outlined">Secondary action</Button>
            </Stack>
          </Container>
        </Box>
        <Container sx={{ py: 8 }} maxWidth="md">
          {/* End hero unit */}
          <Grid container spacing={4}>
            {cards.map((card) => (
              <Grid item key={card} xs={12} sm={6} md={4}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardMedia
                    component="img"
                    sx={{
                      // 16:9
                      pt: '56.25%'
                    }}
                    image="https://source.unsplash.com/random"
                    alt="random"
                  />
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography gutterBottom variant="h5" component="h2">
                      Heading
                    </Typography>
                    <Typography>
                      This is a media card. You can use this section to describe the content.
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button size="small">View</Button>
                    <Button size="small">Edit</Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </main>
      {/* Footer */}
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
