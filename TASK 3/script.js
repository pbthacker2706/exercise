let inp = document.querySelector("#in");
let out = document.querySelector("#out");

function multiply(number, result) {
  let carry = 0;
  for (let i = 0; i < result.length; i++) {
    let prod = result[i] * number + carry;
    result[i] = prod % 100000;
    carry = Math.floor(prod / 100000);
  }

  while (carry > 0) {
    result.push(carry % 100000);
    carry = Math.floor(carry / 100000);
  }

  return result;
}

function computeFactorial(n) {
  let result = [1];

  for (let i = 2; i <= n; i++) {
    result = multiply(i, result);
  }

  return result.reverse().join("");
}

function handleFactorial() {
  let n = parseInt(inp.value);
  if (isNaN(n) || n < 0) {
    out.innerText = "Please enter a valid non-negative number";
    return;
  }

  let ans = computeFactorial(n);
  out.innerText = ans;
  console.log(ans);
}
