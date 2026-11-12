import * as tf from '@tensorflow/tfjs'
import { MLP } from './constants.ts'

export type TrainingExample = { embedding: number[]; label: 0 | 1 }

export type BatchPredictor = (embeddings: number[][]) => number[]

export async function trainMlp(examples: TrainingExample[], dim: number, seed: number = MLP.seed): Promise<BatchPredictor> {
  await tf.setBackend('cpu')
  await tf.ready()

  const model = tf.sequential()
  model.add(
    tf.layers.dense({
      units: MLP.hiddenUnits,
      activation: 'relu',
      inputShape: [dim],
      kernelInitializer: tf.initializers.glorotUniform({ seed }),
    }),
  )
  model.add(
    tf.layers.dense({
      units: 1,
      activation: 'sigmoid',
      kernelInitializer: tf.initializers.glorotUniform({ seed: seed + 1 }),
    }),
  )
  model.compile({ optimizer: tf.train.adam(MLP.learningRate), loss: 'binaryCrossentropy' })

  const inputs = tf.tensor2d(examples.map((example) => example.embedding))
  const labels = tf.tensor2d(examples.map((example) => [example.label]))
  await model.fit(inputs, labels, { epochs: MLP.epochs, batchSize: examples.length, shuffle: false, verbose: 0 })
  inputs.dispose()
  labels.dispose()

  return (embeddings) => {
    if (embeddings.length === 0) {
      return []
    }
    return tf.tidy(() => {
      const output = model.predict(tf.tensor2d(embeddings)) as tf.Tensor
      return Array.from(output.dataSync())
    })
  }
}
