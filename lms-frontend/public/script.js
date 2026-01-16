

 


  // Department card click navigation
  document.querySelectorAll(".department-card").forEach(card => {
    const deptName = card.querySelector("h3").innerText.trim();

    card.addEventListener("click", () => {
      if (deptName === "Computer Science")
        window.open("cse.html", "_blank");
      else if (deptName === "Electronics")
        window.open("ece.html", "_blank");
      else if (deptName === "Electrical")
        window.open("eee.html", "_blank");
      else if (deptName === "Mechanical")
        window.open("mech.html", "_blank");
      else if (deptName === "Civil")
        window.open("civil.html", "_blank");
      else if (deptName === "Physics")
        window.open("physics.html", "_blank");
      else if (deptName === "Chemistry")
        window.open("chemistry.html", "_blank");
      else if (deptName === "Mathematics")
        window.open("maths.html", "_blank");
      else if (deptName === "English")
        window.open("english.html", "_blank");
      else if (deptName === "General")
        window.open("general.html", "_blank");
    });
  });

  // CTA button behavior
 document.querySelectorAll('.btn-outline').forEach(button => {
  button.addEventListener('click', function() {
    window.open("libguide.html", "_blank");
  });
});





