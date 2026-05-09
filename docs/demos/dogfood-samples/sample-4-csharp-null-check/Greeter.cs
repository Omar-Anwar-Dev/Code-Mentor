// Sample 4 — C# missing null-check (expected correctness recommendation)
using System;

namespace Demo
{
    public class Greeter
    {
        public string Greet(string name)
        {
            return "Hello, " + name.ToUpper();   // NullReferenceException on null
        }
    }
}
