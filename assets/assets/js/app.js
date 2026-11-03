
document.addEventListener("DOMContentLoaded", () => {
  console.log("YEUMKEUN Student Website Ready");

  const year = document.getElementById("currentYear");
  if (year) year.textContent = new Date().getFullYear();

  const menuButton = document.getElementById("menuToggle");
  const menu = document.getElementById("mainMenu");

  if (menuButton && menu) {
    menuButton.addEventListener("click", () => {
      menu.classList.toggle("hidden");
    });
  }
});
