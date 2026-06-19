import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  declaration: true,
  clean: true,
  entries: [
    {
      builder: 'mkdist',
      input: 'src/',
      outDir: 'dist',
      ext: 'mjs',
      addRelativeDeclarationExtensions: true,
    },
  ],
  externals: ['@nuxt/kit', 'nuxt', 'nuxt/app', 'vue'],
})
