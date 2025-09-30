(() => {
  $('#issue_assigned_to_id').select2().on('select2:open', function () {
    setTimeout(function () {
      $('.select2-results__options').scrollTop(0);
    },40)
  });

  $('.wiki img').hide();
})();