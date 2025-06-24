const form = document.querySelector('form');
form.addEventListener('submit', function(event) {
  event.preventDefault(); 
  
  let name = document.querySelector('input[name="name"]').value.trim();
  let comments = document.querySelector('textarea[name="comments"]').value.trim();
  let gender = document.querySelector('input[name="gender"]:checked');  
  let errors = [];
  let firstelement=null;
  
  if (name === "") {
    errors.push("Name is empty");
    firstelement=document.querySelector('input[name="name"]');
  }
  
  if (comments === "") {
    errors.push("Comments are empty");
    firstelement=document.querySelector('textarea[name="comments"]');
  }
  
  if (!gender) {
  
    errors.push("Please select a gender");
    firstelement=document.querySelector('input[name="gender"]')[0];
  }
  
  if (errors.length > 0) {
    alert(errors.join('\n'));  
    firstelement.focus();
  } else {
    alert("Form submitted successfully!");
    
  }
});