use clap::Parser;

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// Path to input PDF file
    input: String,

    /// Path to output PDF file
    output: String,
}

fn main() {
    let args = Args::parse();

    println!("Input: {}\nOutput: {}", args.input, args.output);
}
