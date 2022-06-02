// void main() {
//   var fName = "Saman";
//   String lName = "Arshad";
//   print(fName + " " + lName);
// }

// import 'dart:io';
// main() {
//   stdout.writeln("What's your name?");
//   String ?name = stdin.readLineSync();
//   print("My name is $name");
// }

// Inline comment

/* 
Block comment
*/

/// Documentation
/// 
/// 
/// 
/// End of documentation

// Data types

/*
Strongly Typed Language :- The type of a variable is known at compile time. 
e.g. - C++, Java, Swift

Dynamic Typed Language :- The type of a variable is known at run time.
e.g. -  Python, Ruby, Javascript
*/

main() {

  /*
  int 
  double
  String
  bool
  dynamic
  */

  int am1 = 100;
  int am2 = 200;

  print('Amount 1 $am1 || Amount 2 $am2 \n');

  double am3 = 100.4;
  double am4 = 102.3;

  print('Amount 3 $am3 || Amount 4 $am4 \n');

  String fName = 'Saman';
  var lName = 'Arshad';

  print('Name is $fName $lName \n');

  bool isThisTrue1 = true;
  var isThisTrue2 = false;

  print('Bool val1 $isThisTrue1 || Bool val2 $isThisTrue2 \n');

  dynamic weakVar = 102;

  print('Weak variable 1 - $weakVar \n');

  weakVar = 'Saman Arshad in weak variable';
  print('Weak variable 2 - $weakVar');

  /*
  dynamic: can change TYPE of the variable, & can change VALUE of the variable later in code. 
  var: can't change TYPE of the variable, but can change the VALUE of the variable later in code.
  */

}