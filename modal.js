window.addEventListener('load', function () {
  let modal = $("modal");
  let btn = $("misc");
  btn.onclick = function () {
    modal.style.display = "block";
  }
  let span = document.getElementsByClassName("close")[0];
  span.onclick = function () {
    modal.style.display = "none";
  }
  window.onclick = window.ontouchend = function (event) {
    if (event.target === modal) {
      modal.style.display = "none";
    }
  }

  const modalShown = localStorage.getObj("modalShown") || false;
  if (!modalShown) {
    modal.style.display = "block";
    localStorage.setObj("modalShown", true)
  }
});

function closeModal() {
  $("modal").style.display = "none";
}