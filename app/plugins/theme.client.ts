export default defineNuxtPlugin(() => {
  const { applyTheme } = useTheme()
  applyTheme() // runs immediately on client, before paint
})
